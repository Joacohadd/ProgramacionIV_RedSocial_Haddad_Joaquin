# Trama · Red social (TP 2, Programación IV)

Implementación de los **Sprints 1, 2 y 3** del enunciado. Son dos proyectos separados: Angular en [`frontend`](frontend/) y NestJS + MongoDB en [`backend`](backend/).

## Qué está implementado

| Sprint | Frontend | Backend |
| --- | --- | --- |
| 1 | Login, registro, validaciones, rutas, favicon, interfaz adaptable | Módulos `auth`, `users`, `posts`; registro con foto y contraseña hasheada; login; unicidad de correo y usuario |
| 2 | Feed real, orden por fecha o likes, paginación, nueva publicación con imagen, like/quitar like, baja propia con modal, Mi Perfil y últimas tres publicaciones | Alta, listado paginado y filtrado, baja lógica, likes únicos; identidad y permisos validados en servidor |
| 3 | Detalle de publicación, comentarios reales en detalle y perfil, carga por tandas, edición propia, pantalla de carga y aviso de renovación | Detalle protegido, colección de comentarios con autor y fecha, edición autorizada, validación y renovación de JWT |

En Mi Perfil se muestran las últimas tres publicaciones propias y hasta dos comentarios recientes por publicación. El hilo completo se abre desde «Ver conversación». La edición de perfil y foto usa `PATCH /users/me`.

Por pedido posterior, se agregó recuperación de contraseña: desde Login se solicita un enlace para el correo o usuario registrado, se elige una clave nueva y se vuelve a iniciar sesión. No revela si una cuenta existe. El enlace vence a los 30 minutos, solo sirve una vez y al usarlo invalida las sesiones anteriores. Esta función es adicional a los requisitos de los dos primeros sprints.

## Inicio local

Requisitos: Node.js 20 o superior, npm y MongoDB local o Atlas.

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Editar .env: URI real de MongoDB y un JWT_SECRET aleatorio de al menos 32 caracteres.
npm run start:dev
```

Escucha en `http://localhost:3000`. `MONGODB_URI` y `JWT_SECRET` son obligatorios. `MONGODB_DB` fija la base `trama_tp2` sin tener que alterar la URI que entrega Atlas. Si el DNS local no resuelve registros SRV de Atlas, `MONGODB_DNS_SERVERS` admite servidores DNS separados por coma. No hay credenciales embebidas. En local se guardan fotos en `backend/uploads/`; para publicar se configura `IMAGE_STORAGE=cloudinary` y las tres variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`. MongoDB guarda la URL resultante. Se aceptan JPG, PNG, WebP y GIF: hasta 5 MB en local y 4 MB en Vercel, dejando margen al límite de la plataforma. Se comprueba la firma del archivo. `PUBLIC_API_URL` define la URL de imágenes locales. `FRONTEND_ORIGIN` permite el origen del Angular y puede contener varios orígenes separados por coma.

Para recuperar contraseñas en producción, configurar `FRONTEND_URL` con la URL pública HTTPS de Angular y `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` y, si el proveedor lo requiere, `SMTP_USER` y `SMTP_PASS`. Se usa SMTP con TLS; el enlace llega al correo registrado. En desarrollo local se puede usar `FRONTEND_URL=http://localhost:4200` y `PASSWORD_RESET_DEV_LOG=true`: el enlace se guarda en `backend/.password-reset-dev-link.txt` (ignorado por Git), sin enviarse por correo. La pantalla indica este modo después de pedirlo. El archivo contiene un enlace secreto de un solo uso y vence a los 30 minutos; no compartirlo. Este modo solo funciona fuera de producción y con URL local. Si no hay SMTP ni modo local, la API responde 503 en lugar de fingir que envió el correo.

### Frontend

```powershell
cd frontend
npm install
npm start
```

Abrir `http://localhost:4200`. Para un build público, definir `TRAMA_API_URL` con la URL HTTPS de la API; el script de compilación la coloca en el HTML generado. Sin esa variable, el build local conserva `http://localhost:3000`. El cliente envía el JWT en `Authorization: Bearer` y conserva la sesión en `localStorage`.

## Rutas API (propuesta de implementación)

| Método | Ruta | Acción |
| --- | --- | --- |
| POST | `/auth/register` | Crear usuario; `multipart/form-data` con `avatar` opcional |
| POST | `/auth/login` | Iniciar sesión con correo o nombre de usuario |
| POST | `/auth/authorize` | Validar el JWT Bearer y devolver los datos del usuario |
| POST | `/auth/refresh` | Renovar un JWT vigente por 15 minutos con la misma identidad |
| POST | `/auth/password/forgot` | Solicitar enlace de recuperación con correo o usuario |
| POST | `/auth/password/reset` | Cambiar la contraseña con un enlace vigente |
| PATCH | `/users/me` | Actualizar los datos del propio perfil y foto opcional; requiere JWT |
| GET | `/posts?sort=date\|likes&offset=0&limit=5&userId=...` | Listar publicaciones activas |
| POST | `/posts` | Crear publicación; `multipart/form-data` con `image` opcional |
| GET | `/posts/:id` | Ver una publicación activa |
| DELETE | `/posts/:id` | Baja lógica, autor o administrador |
| POST | `/posts/:id/likes` | Dar un like por usuario |
| DELETE | `/posts/:id/likes` | Quitar el like propio |
| GET | `/posts/:id/comments?offset=0&limit=10` | Listar del más reciente al más antiguo |
| POST | `/posts/:id/comments` | Agregar un comentario con la identidad de la sesión |
| PUT | `/posts/:id/comments/:commentId` | Editar un comentario propio y marcarlo como editado |

Todas las rutas de publicaciones requieren JWT. `register` y `login` devuelven `{ user, token }` sin el hash de la contraseña. El registro público fija `role: usuario`; el rol nunca se toma del formulario. Respuestas: 201 al crear, 200 en lecturas/acciones correctas, 400 en validación, 401 sin sesión/credenciales inválidas, 403 en permisos, 404 para post inexistente o dado de baja y 409 en duplicados.

## Decisiones de alcance

- Al arrancar, `/cargando` verifica la sesión local con `authorize`. Cuando quedan 5 de los 15 minutos de vigencia del JWT, el aviso ofrece extenderla. El servidor solo acepta la renovación si el token sigue vigente. Al vencer la sesión o ante un 401 de la API para el token actual, Angular vuelve al login.
- Los comentarios se guardan en `comments` y se relacionan con la publicación y el usuario por ID. El índice por publicación, fecha e ID hace estable el orden cuando dos comentarios tienen la misma fecha. Cada consulta exige que la publicación esté activa.
- Se usa `bcryptjs` con costo 12 para contraseñas. El backend valida cada acción y consulta el usuario en MongoDB para asegurar que siga activo.
- Los likes se guardan como IDs únicos en el documento del post. `$addToSet` junto con una condición `$ne` hace atómica la regla de un like por usuario. `likesCount` sostiene el ordenamiento. Esta estructura simple se puede migrar a colección separada si la cátedra la exige más adelante.
- Las imágenes se guardan en disco durante el desarrollo local; en la versión publicada se usa Cloudinary, como en los ejemplos de clase11 y clase12.

## Relación con lo visto en clase

Se siguieron los patrones centrales de `clase3` a `clase8` (Angular standalone, routing, formularios reactivos, servicios, `HttpClient`, guards y signals) y `clase10`/`clase11` (Nest con módulos, controladores, servicios, DTO, `ValidationPipe`, esquemas e índices Mongoose, `FileInterceptor`). El frontend separa `app.config.ts`, servicios de autenticación y publicaciones, guard, interceptor y plantillas HTML, como en los ejemplos de clase; el CSS compartido se organiza por pantalla. El backend autentica con JWT propio y, al publicarse, usa Cloudinary para las imágenes, como en clase.

## Verificación

```powershell
cd backend
npm test       # compila y ejecuta pruebas de reglas de negocio y subida de imágenes
npm run check:db # comprueba la conexión de Atlas sin mostrar credenciales
cd ../frontend
npm run build  # build de producción en dist/trama/browser
```

Las pruebas conservan la cobertura de los sprints previos y agregan solicitudes HTTP locales para verificar autorización, renovación, paginación de comentarios y permiso de edición. Para probar la interfaz, abrí el título de un post desde el feed, comentá, editá tu comentario y recargá el detalle con una sesión vigente.

## Publicación

Publicá el frontend y el backend del Sprint 3 juntos, porque la aplicación usa las nuevas rutas de sesión y comentarios. El backend debe permitir `PUT` en CORS para guardar las ediciones entre dominios.

Trama está disponible en [trama-gilt-one.vercel.app](https://trama-gilt-one.vercel.app). El frontend se aloja en Vercel y utiliza el backend publicado en Render: `https://programacioniv-redsocial-haddad-joaquin.onrender.com`. Ambos servicios están conectados a este repositorio y usan respectivamente los directorios `frontend` y `backend`. También permanece desplegada una copia de la API en Vercel (`https://trama-api.vercel.app`), pero el frontend publicado apunta a Render.

El frontend usa `TRAMA_API_URL` para la dirección HTTPS del backend. `frontend/vercel.json` define la compilación, el directorio de salida y las rutas de Angular; el build en Vercel falla si falta la URL de la API. El backend usa variables privadas para MongoDB, JWT y Cloudinary, y `FRONTEND_ORIGIN` para permitir el origen del frontend. Las imágenes anteriores se copiaron a Cloudinary y se conservaron sus archivos y un respaldo de las URL originales en `backend/uploads`, que no se publica en Git. En el plan gratuito de Render el backend puede tardar en responder después de un período de inactividad. La recuperación por archivo es solo para desarrollo; el envío de enlaces por correo en la aplicación publicada sigue pendiente. El plan gratuito de Render bloquea los puertos SMTP 25, 465 y 587, por lo que habrá que elegir una alternativa compatible al configurarlo.
