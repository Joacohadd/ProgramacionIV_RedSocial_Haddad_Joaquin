# Trama · Sprint 1

Red social del TP 2 de Programación IV, con frontend Angular, backend NestJS y MongoDB.

> **Sobre esta rama:** el proyecto se subió inicialmente con los dos primeros sprints en un mismo commit. Esta versión del Sprint 1 fue reconstruida después, a partir del proyecto completo, para representar el alcance de la primera entrega. No es un registro histórico de una versión guardada en ese momento.

La rama `sprint-2` y `main` conservan la aplicación completa hasta la segunda entrega. La web pública corresponde a `main`, no a esta maqueta. El despliegue automático de `sprint-1` en los proyectos actuales de Vercel está deshabilitado: para publicar esta versión por separado hay que configurar su propio backend y sus variables de entorno.

## Alcance de esta entrega

- Registro y login contra el servidor propio, con formularios y validaciones en Angular y NestJS.
- MongoDB guarda usuarios con correo y nombre de usuario únicos, contraseña hasheada y rol `usuario` por defecto.
- Se puede adjuntar una foto de perfil; en local se guarda en `backend/uploads` y en despliegue puede usarse Cloudinary.
- Pantallas navegables de login, registro, publicaciones y Mi Perfil; favicon y diseño responsive.
- Publicaciones y Mi Perfil son **maquetas con datos de ejemplo identificados**: no llaman a una API de posts ni permiten publicar, dar likes, eliminar o editar perfiles.
- El módulo de publicaciones es estructural. Las acciones reales de publicaciones y likes corresponden al Sprint 2; comentarios y JWT corresponden al Sprint 3.

Como indica la primera entrega, las pantallas de maqueta se pueden visitar sin iniciar sesión. La aplicación completa aplica las restricciones de acceso de los sprints posteriores.

## Inicio local

Requisitos: Node.js compatible con Angular 21, npm y una instancia de MongoDB local o Atlas.

### Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
# Editar MONGODB_URI si se usa Atlas.
npm run start:dev
```

El servidor escucha en `http://localhost:3000`. Por defecto usa la base `trama_sprint_1`, separada de la base del proyecto completo. Con Atlas, revisar que `MONGODB_DB` siga indicando una base de pruebas separada. Para imágenes en Cloudinary, configurar `IMAGE_STORAGE=cloudinary` y las tres variables `CLOUDINARY_*` del ejemplo. No subir `.env` ni credenciales al repositorio.

### Frontend

```powershell
cd frontend
npm ci
npm start
```

Abrir `http://localhost:4200`. El frontend usa el backend local por defecto. Para compilar contra un backend publicado, definir `TRAMA_API_URL`; el servidor también necesita `FRONTEND_ORIGIN` con la URL del frontend.

## API de Sprint 1

| Método | Ruta | Acción |
| --- | --- | --- |
| POST | `/auth/register` | Valida los datos y crea una cuenta; acepta un archivo opcional `avatar`. |
| POST | `/auth/login` | Verifica correo o usuario y contraseña; devuelve los datos públicos del usuario. |

La contraseña se comprueba con bcrypt y nunca se devuelve en la respuesta. El inicio de sesión de esta maqueta guarda solo los datos visibles del usuario en el navegador; la emisión y validación de JWT se incorporan en la aplicación completa.

## Verificación

```powershell
cd backend
npm test
cd ../frontend
npm run build
```

Las pruebas del backend cubren registro, duplicados, contraseñas distintas, login, hash y validación de datos. El build del frontend verifica las pantallas y componentes de esta rama.
