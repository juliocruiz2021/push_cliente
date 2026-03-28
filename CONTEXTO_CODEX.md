# Contexto del Proyecto - Push Cliente

## Estado actual

Push Cliente es el backend Laravel + panel React que trabaja junto con la app Flutter `facturame`.

- Produccion:
  - Panel: `https://facturame.appsigasv.com`
  - API publica: `https://facturame.appsigasv.com/api/v1`
- VPS:
  - Host: `138.197.36.98`
  - SSH: `ssh -p 2222 root@138.197.36.98`
- Rama activa:
  - `feature/confirmacion-recepcion-limpieza`

## Rutas locales

- Backend: `D:\Desarrollo_Flutter\push_cliente\backend`
- Frontend: `D:\Desarrollo_Flutter\push_cliente\frontend`
- App Flutter relacionada: `D:\Desarrollo_Flutter\clientes\app_clientes`
- APK de distribucion: `D:\Desarrollo_Flutter\clientes\facturame.apk`

## Stack

- Backend: Laravel 11 + PHP 8.4
- Frontend: React 19 + Vite + Tailwind CSS 3 + TanStack Query v5
- DB: PostgreSQL
- Auth web: Sanctum con Bearer token
- Push: Firebase Cloud Messaging por `kreait/laravel-firebase`

## Regla de negocio mas importante

El enrutamiento de notificaciones YA NO depende de la empresa del dispositivo destino.

Regla vigente:
- Cada dispositivo sigue registrandose en `clientes_empresa` con llave unica `(empresa_id, numero_celular)`.
- Al enviar una notificacion, el backend busca todos los dispositivos activos con `numero_celular = numero_destino`, aunque pertenezcan a otras empresas.
- Si encuentra varios registros con el mismo numero, envia a todos los tokens FCM unicos encontrados.
- Si dos filas tienen el mismo `fcm_token`, se deduplican para no disparar dos pushes al mismo equipo.
- Para el historial en `mensajes`, se guarda como `cliente_empresa_id` preferido uno de la misma empresa emisora si existe; si no, se usa el primer destino encontrado.

Consecuencia funcional:
- Un telefono puede estar registrado para Empresa A y Empresa B.
- Si el numero coincide con el destinatario, ese telefono recibe la notificacion sin importar desde que empresa se envio.

## Confirmacion de recepcion

La confirmacion ya no depende de la empresa emisora.

Regla vigente:
- `POST /api/v1/clientes/confirmar-recepcion`
- valida `mensaje_id`
- valida que `numero_celular` coincida con `mensajes.numero_destino`
- valida que exista un dispositivo activo con ese numero
- si viene `device_uuid`, acepta coincidencia exacta o registro legacy con `device_uuid = null`

Esto permite que un telefono registrado en otra empresa confirme la recepcion si el numero coincide.

## Modelos y tablas clave

- `empresas`
  - `id`, `nombre`, `nombre_servidor`, `registro_iva`, `activo`
- `clientes_empresa`
  - `id`, `empresa_id`, `numero_celular`, `nombre_usuario`, `nombre_servidor`
  - `device_uuid`, `fcm_token`, `plataforma`, `version_app`, `activo`
  - unique: `(empresa_id, numero_celular)`
- `mensajes`
  - `id`, `empresa_id`, `cliente_empresa_id`, `numero_destino`
  - `titulo`, `cuerpo`, `payload_json`, `estado`, `proveedor`
  - `recepcion_confirmada_at`, `recepcion_confirmada_por`, `recepcion_device_uuid`
- `clientes_compartidos`
  - sync de clientes por empresa
- `admin_users`
- `personal_access_tokens`
- `logs_auditoria`

## Endpoints relevantes

### Publicos para app movil

- `POST /api/v1/clientes/registrar-dispositivo`
  - registra o actualiza por `(empresa_id, numero_celular)`
- `POST /api/v1/clientes/enviar-datos`
  - busca por `numero_destino` global en todas las empresas
  - crea un mensaje
  - envia push a todos los tokens FCM unicos
- `POST /api/v1/clientes/confirmar-recepcion`
  - confirma por `mensaje_id + numero_celular (+ device_uuid opcional)`

### Auth web

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Protegidos del panel

- `GET /api/v1/dashboard`
- `GET /api/v1/empresas`
- `POST /api/v1/empresas`
- `PUT /api/v1/empresas/{id}`
- `DELETE /api/v1/empresas/{id}`
- `GET /api/v1/clientes`
- `POST /api/v1/clientes`
- `PUT /api/v1/clientes/{cliente}`
- `DELETE /api/v1/clientes/{cliente}`
- `POST /api/v1/mensajes/enviar`
- `GET /api/v1/mensajes/historial`
- `GET /api/v1/mensajes/nuevos`
- `GET /api/v1/clientes-compartidos`
- `POST /api/v1/clientes-compartidos/sync`
- `GET /api/v1/admin-users`
- `POST /api/v1/admin-users`
- `PUT /api/v1/admin-users/{adminUser}`
- `DELETE /api/v1/admin-users/{adminUser}`

## Modulos del panel

- `Dashboard`
- `Empresas`
- `Clientes`
  - ya permite crear, editar y eliminar dispositivos manualmente
  - muestra empresa, numero, usuario, servidor, UUID, version y estado del token
- `Mensajes`
- `Usuarios`

## Archivos clave

### Backend

- `backend/app/Http/Controllers/Api/V1/ClienteController.php`
  - registro de dispositivos
  - envio publico desde la app
  - confirmacion de recepcion
  - CRUD manual de dispositivos para el panel
- `backend/app/Http/Controllers/Api/V1/MensajeController.php`
  - envio desde el panel
  - historial
  - polling de nuevos
- `backend/app/Services/FcmService.php`
  - envio individual y multiple por coleccion de destinos
- `backend/routes/api.php`

### Frontend

- `frontend/src/pages/Clientes.jsx`
  - listado de dispositivos
  - formulario para crear/editar manualmente
  - eliminacion manual
- `frontend/src/pages/Mensajes.jsx`
- `frontend/src/pages/Empresas.jsx`
- `frontend/src/pages/Usuarios.jsx`

## Flujo actual resumido

1. La app Flutter registra el telefono con `celular_propio`.
2. Un operador envia datos a `numero_destino`.
3. El backend busca todos los `clientes_empresa` activos con ese numero, sin filtrar por empresa.
4. FCM envia a todos los tokens unicos encontrados.
5. El telefono receptor muestra el detalle usando `empresa` y `servidor` dentro del JSON del mensaje.
6. Al abrir el detalle, la app confirma recepcion con `mensaje_id` y `numero_celular`.
7. El panel web refleja historial, estados y recepcion.

## Notas operativas

- El panel usa Bearer token; no usa sesion stateful por cookies.
- En produccion el panel y la API salen por Apache reverse proxy con Let's Encrypt.
- El sitio legado `appsigasv.com` no debe tocarse; `facturame.appsigasv.com` vive aparte.
- Al desplegar, ignorar archivos runtime no versionables:
  - `backend/storage/`
  - `backend/bootstrap/cache/`
  - `backend/public/.htaccess`
  - `backend/public/favicon.ico`
