# Trama · Red social (TP 2, Programación IV)

Implementación de los **Sprints 1 y 2** del enunciado. Son dos proyectos separados: Angular en [`frontend`](frontend/) y NestJS + MongoDB en [`backend`](backend/). La interfaz usa una identidad de afiches digitales: azul intenso, amarillo lima, fondos fríos, tipografía geométrica y composiciones adaptables a móvil. Su paleta y lenguaje gráfico son distintos de los del TP1.

## Qué está implementado

| Sprint | Frontend | Backend |
| --- | --- | --- |
| 1 | Login, registro, validaciones, rutas, favicon, interfaz adaptable | Módulos `auth`, `users`, `posts`; registro con foto y contraseña hasheada; login; unicidad de correo y usuario |
| 2 | Feed real, orden por fecha o likes, paginación, nueva publicación con imagen, like/quitar like, baja propia con modal, Mi Perfil y últimas tres publicaciones | Alta, listado paginado y filtrado, baja lógica, likes únicos; identidad y permisos validados en servidor |

El feed y Mi Perfil ya usan datos reales. La zona de comentarios en Mi Perfil **es una vista preliminar identificada como tal**, porque su API y sus acciones corresponden al Sprint 3. Por pedido posterior, se agregó la edición de los datos del perfil y la foto mediante `PATCH /users/me`; el rol y la contraseña no son editables desde ese formulario. Como la consigna no asigna esa función a un sprint, conviene confirmar su ubicación con la cátedra. No se adelantaron detalle de post, comentarios, dashboard, PWA, guardados ni compartidos.

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
| POST | `/auth/password/forgot` | Solicitar enlace de recuperación con correo o usuario |
| POST | `/auth/password/reset` | Cambiar la contraseña con un enlace vigente |
| PATCH | `/users/me` | Actualizar los datos del propio perfil y foto opcional; requiere JWT |
| GET | `/posts?sort=date\|likes&offset=0&limit=5&userId=...` | Listar publicaciones activas |
| POST | `/posts` | Crear publicación; `multipart/form-data` con `image` opcional |
| DELETE | `/posts/:id` | Baja lógica, autor o administrador |
| POST | `/posts/:id/likes` | Dar un like por usuario |
| DELETE | `/posts/:id/likes` | Quitar el like propio |

Todas las rutas de publicaciones requieren JWT. `register` y `login` devuelven `{ user, token }` sin el hash de la contraseña. El registro público fija `role: usuario`; el rol nunca se toma del formulario. Respuestas: 201 al crear, 200 en lecturas/acciones correctas, 400 en validación, 401 sin sesión/credenciales inválidas, 403 en permisos, 404 para post inexistente o dado de baja y 409 en duplicados.

## Decisiones de alcance

- La consigna formal incorpora JWT y renovación de sesión en Sprint 3, pero Sprint 2 exige asociar publicaciones, likes y bajas a una identidad validada. Se incorpora **emisión y verificación de JWT de 15 minutos** como base de seguridad ahora. `authorize`, `refresh`, aviso de expiración y pantalla de carga quedan para Sprint 3.
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

Las pruebas automatizadas cubren registro, duplicados, login inválido, edición propia del perfil, conservación del rol, rechazo de correo duplicado y fecha futura, filtrado/paginación/orden, like único, baja lógica y guard de sesión, incluidos token vencido y usuario deshabilitado. También cubren la respuesta genérica de recuperación, hash y caducidad del enlace, cambio único de clave e invalidación de sesiones. Antes se ejecutó una prueba integral contra MongoDB Atlas en una base temporal: registro de dos usuarios, login, acceso protegido, alta y listado de una publicación, like y rechazo del duplicado, quitar like, rechazo de baja ajena y baja lógica por el autor. La base temporal se eliminó después de la prueba. La conexión a Atlas volvió a comprobarse correctamente con `npm run check:db` después de actualizar la lista de IP. La recuperación nueva y la edición completa del perfil todavía requieren una prueba manual integral con una cuenta real.

## Publicación

El repositorio puede contener `frontend` y `backend` juntos. Para importar el frontend en Vercel, seleccionar `frontend` como Root Directory y configurar `TRAMA_API_URL` con la dirección HTTPS pública del backend. `frontend/vercel.json` define la compilación, el directorio de salida y las rutas de Angular. El build en Vercel falla con un mensaje claro si falta la URL de la API, para evitar publicar una app que apunte a localhost. No subir `backend/.env`, archivos de recuperación ni `uploads` al repositorio.

**Todavía no se realizó un despliegue público completo.** Importar el mismo repositorio dos veces en Vercel, con Root Directory `backend` y `frontend`, respectivamente. En el backend configurar `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `IMAGE_STORAGE=cloudinary`, las credenciales de Cloudinary y `FRONTEND_ORIGIN` con la dirección pública del frontend. Atlas debe permitir la conexión del hosting. En el frontend configurar `TRAMA_API_URL` con la dirección HTTPS del backend y desplegar de nuevo después de cambiarla. Las imágenes cargadas anteriormente en `backend/uploads` siguen siendo locales y deben migrarse para verse desde la versión publicada. La recuperación por archivo es solo para desarrollo; para enviar enlaces reales hay que configurar SMTP.
