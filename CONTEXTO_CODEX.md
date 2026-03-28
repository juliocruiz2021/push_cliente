# Contexto del Proyecto — Para OpenAI Codex / Claude

## ¿Qué es este sistema?

**Push Cliente** es el backend y panel web del sistema de notificaciones push para empresas.
Trabaja junto con la app móvil Flutter "Facturame".

## Despliegue actual

- Panel web productivo: `https://facturame.appsigasv.com`
- La API pÃºblica para la app mÃ³vil sale por `https://facturame.appsigasv.com/api/v1`
- En el VPS el panel y el backend siguen corriendo internamente en `8081` y `8082`, publicados por Apache reverse proxy + Let's Encrypt, sin tocar el sitio legado de `appsigasv.com`

| Proyecto | Repo | Branch activo |
|---|---|---|
| Backend + Frontend web | `juliocruiz2021/push_cliente` | `feature/confirmacion-recepcion-limpieza` |
| App móvil Flutter | `juliocruiz2021/facturame` | `feature/confirmacion-recepcion-limpieza` |

---

## Rutas locales

| Componente | Ruta |
|---|---|
| Backend Laravel | `D:\Desarrollo_Flutter\push_cliente\backend\` |
| Frontend React | `D:\Desarrollo_Flutter\push_cliente\frontend\` |
| App Flutter | `D:\Desarrollo_Flutter\clientes\app_clientes\` |
| APK | `D:\Desarrollo_Flutter\clientes\facturame.apk` |

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Laravel 11 + PHP 8.2 (`C:\xampp\php\php.exe`) |
| Auth API | Laravel Sanctum (tokens Bearer) |
| Push | Firebase Cloud Messaging (`kreait/laravel-firebase`) |
| DB | PostgreSQL — Docker `sigaerp_postgres` (127.0.0.1:5432) |
| Frontend | React 19 + Vite + Tailwind CSS 3 + TanStack Query v5 |
| HTTP client | Axios, baseURL `http://127.0.0.1:8000/api/v1` |
| Frontend puerto | 5200 (dev) |

---

## Base de datos (PostgreSQL)

- **Host:** 127.0.0.1:5432 (Docker container `sigaerp_postgres`)
- **DB:** `push_cliente`
- **Usuario:** `sigaerp_user` / `sigaerp_pass`

```
empresas
  id, nombre, registro_iva, activo, timestamps

clientes_empresa
  id, empresa_id (FK), numero_celular, nombre_usuario, nombre_servidor,
  device_uuid, fcm_token, plataforma, version_app, activo, timestamps
  UNIQUE: (empresa_id, numero_celular)

mensajes
  id, empresa_id (FK), cliente_empresa_id (FK), numero_destino,
  titulo, cuerpo, payload_json (jsonb),
  estado ENUM(pendiente|enviado|fallido),
  proveedor, enviado_at, timestamps

clientes_compartidos
  id, empresa_id (FK), sync_id, nombre, dui, registro_iva,
  giro, direccion, celular, email, creado_por, actualizado_por, timestamps
  UNIQUE: (empresa_id, sync_id)

admin_users
  id, name, email, password, timestamps

personal_access_tokens   — Sanctum
logs_auditoria
```

### Migraciones clave
```
2024_01_01_000001_create_empresas_table.php
2024_01_01_000002_create_clientes_empresa_table.php
2024_01_01_000003_create_mensajes_table.php
2024_01_01_000004_create_admin_users_table.php
2024_01_01_000005_create_logs_auditoria_table.php
2026_03_27_000001_add_nombre_servidor_to_clientes_empresa.php
2026_03_28_023200_create_personal_access_tokens_table.php
2026_03_28_030001_add_recepcion_confirmada_to_mensajes_table.php
2026_03_28_040001_create_clientes_compartidos_table.php
```

---

## Credenciales por defecto (seeder)

- **Admin panel:** `admin@pushcliente.com` / `Admin1234!`
- **Empresa demo:** registro_iva `12345-6`, nombre `EMPRESA DE PRUEBA`

---

## Firebase

Credenciales en: `backend/storage/app/firebase-credentials.json`

Variables `.env` requeridas:
```
FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json
FIREBASE_PROJECT_ID=<id del proyecto Firebase>
```

---

## API Endpoints

### Públicos (app móvil, sin auth) — throttle 30/min

```
POST /api/v1/clientes/registrar-dispositivo
  Body: {registro_iva, numero_celular, nombre_usuario, nombre_servidor,
         device_uuid, fcm_token, plataforma, version_app}
  Lógica: busca empresa por registro_iva → updateOrCreate en clientes_empresa
          por (empresa_id, numero_celular)

POST /api/v1/clientes/enviar-datos
  Body: {registro_iva, numero_destino, titulo, cuerpo}
  Lógica: busca clientes_empresa WHERE numero_celular = numero_destino
          → obtiene fcm_token → envía FCM → guarda en mensajes

POST /api/v1/clientes/confirmar-recepcion
  Body: {mensaje_id, registro_iva, numero_celular, device_uuid}
  Lógica: valida destinatario → marca `recepcion_confirmada_at`
```

### Auth — throttle 10/min

```
POST /api/v1/auth/login    — {email, password} → {token, user}
POST /api/v1/auth/logout   — (Bearer token requerido)
GET  /api/v1/auth/me       — usuario autenticado
```

### Protegidos (Sanctum Bearer token)

```
GET    /api/v1/dashboard
  Respuesta: {total_empresas, total_clientes, mensajes_enviados,
              mensajes_fallidos, mensajes_hoy, ultimos_mensajes[]}
  Caché: 60 segundos

GET    /api/v1/empresas          — lista con clientes agrupados por nombre_servidor
POST   /api/v1/empresas          — {nombre, registro_iva}
PUT    /api/v1/empresas/{id}     — {nombre, registro_iva, activo}
DELETE /api/v1/empresas/{id}

GET    /api/v1/clientes          — lista con empresa eager loaded

POST   /api/v1/mensajes/enviar   — enviar push desde panel web
GET    /api/v1/mensajes/historial
  Params: registro_iva, estado, fecha_desde, fecha_hasta, search, page
GET    /api/v1/mensajes/nuevos?desde=<ISO>
  Respuesta: {count, mensajes[]}  — para polling tiempo real
```

---

## Archivos clave — Backend

```
app/
  Http/Controllers/Api/V1/
    AuthController.php      — login, logout, me
    EmpresaController.php   — CRUD empresas
    ClienteController.php   — registrarDispositivo, enviarDatos, index
    MensajeController.php   — enviar, historial, nuevos
    DashboardController.php — stats con caché

  Models/
    Empresa.php             — hasMany clientes, mensajes
    ClienteEmpresa.php      — belongsTo empresa; campos: fcm_token, numero_celular...
    Mensaje.php             — belongsTo empresa, clienteEmpresa
    AdminUser.php           — autenticación web (NO usar App\Models\User)

  Services/
    FcmService.php          — envío push vía kreait/laravel-firebase

routes/api.php              — todas las rutas agrupadas bajo /api/v1
```

---

## Archivos clave — Frontend

```
src/
  lib/axios.js              — instancia Axios con baseURL + interceptor Bearer token
  contexts/
    NotifContext.jsx        — polling 20s, badge global, Web Notifications API
  components/
    Layout.jsx              — shell con nav + campanita badge rojo
  pages/
    Login.jsx               — autenticación
    Dashboard.jsx           — stats: empresas, clientes, mensajes
    Empresas.jsx            — CRUD empresas con modal + badges nombre_servidor
    Clientes.jsx            — lista dispositivos con empresa y nombre_servidor
    Mensajes.jsx            — historial + modal enviar + ModalDetalle campos JSON
```

### NotifContext — Polling tiempo real
- Intervalo: 20 segundos
- Key localStorage: `notif_last_checked` (ISO timestamp)
- Llama: `GET /api/v1/mensajes/nuevos?desde=<timestamp>`
- Cuando hay nuevos: incrementa badge, dispara Web Notification, refresca lista Mensajes
- `marcarLeidos()` → resetea badge y timestamp

---

## Flujo completo del sistema

```
App Flutter (operador)
  │ 1. Al iniciar → POST /api/v1/clientes/registrar-dispositivo
  │    {registro_iva, numero_celular (celular_propio), fcm_token, ...}
  │
  │ 2. Operador llena formulario y toca "Enviar"
  │    → POST /api/v1/clientes/enviar-datos
  │    {registro_iva, numero_destino (celularserver), titulo, cuerpo: JSON}
  │
  ▼
Backend Laravel
  │ 3. Busca clientes_empresa WHERE numero_celular = numero_destino
  │ 4. FcmService envía push al fcm_token del destinatario
  │ 5. Guarda en mensajes con estado enviado/fallido
  │
  ▼
Teléfono destino (app Flutter)
  │ 6. Recibe push → banner o diálogo con campos del JSON
  │    {empresa, servidor, data: {nombre, dui, concepto, monto...}}
  │ 7. Al abrir detalle → POST /api/v1/clientes/confirmar-recepcion
  │ 8. Al cerrar diálogo → badge decrementado

Panel web React (admin)
  │ Polling 20s → GET /api/v1/mensajes/nuevos
  │ Badge campanita → click → /mensajes
  └─ Notificación del navegador (Web Notifications API)
```

### JSON del campo `cuerpo` (notificación push)
```json
{
  "empresa": "NOMBRE EMPRESA",
  "servidor": "SIGA1",
  "data": {
    "nombre": "JUAN PEREZ",
    "dui": "12345678",
    "registro_iva": "12345-6",
    "giro": "COMERCIAL",
    "direccion": "CALLE 1",
    "celular": "76543210",
    "email": "juan@email.com",
    "concepto": "FACTURA",
    "monto": 150.00
  }
}
```

---

## Variables de entorno

### Backend `.env`
```
APP_NAME=PushCliente
APP_ENV=local
APP_KEY=<generada con artisan key:generate>
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=push_cliente
DB_USERNAME=sigaerp_user
DB_PASSWORD=sigaerp_pass

FRONTEND_URL=http://localhost:5200

FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json
FIREBASE_PROJECT_ID=<id del proyecto Firebase>
```

### Frontend `.env.local`
```
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

---

## Cómo correr localmente

```bash
# Backend
cd D:\Desarrollo_Flutter\push_cliente\backend
C:\xampp\php\php.exe artisan serve --host=0.0.0.0 --port=8000

# Migraciones + seeder
C:\xampp\php\php.exe artisan migrate
C:\xampp\php\php.exe artisan db:seed

# Frontend
cd D:\Desarrollo_Flutter\push_cliente\frontend
npm run dev -- --port 5200
# Abre: http://localhost:5200
```

> **Requisito:** Docker container `sigaerp_postgres` debe estar corriendo antes de iniciar el backend.

---

## Notas técnicas importantes

1. **Docker puerto 8000**: usar `127.0.0.1:8000` no `localhost:8000` (evita conflictos IPv6).

2. **`ilike` PostgreSQL**: usar `ilike` para búsquedas case-insensitive, no `like`.

3. **Modelo AdminUser**: la autenticación web usa `App\Models\AdminUser`, **NO** `App\Models\User`.

4. **celular_propio vs celularserver**:
   - `celular_propio` = número de ESTE teléfono → se registra en `clientes_empresa.numero_celular`
   - `celularserver` = número DESTINO → se pasa como `numero_destino` en enviar-datos
   - El backend busca el destinatario por `numero_celular = numero_destino`
   - **NUNCA** usar `celularserver` como `numero_celular` al registrar dispositivo

5. **esFactura (frontend React)**: `!!(data.nombre || data.dui || data.registro_iva || data.giro || data.concepto)`.

6. **Parseo JSON cuerpo en Flutter**: `empresa` y `servidor` están al nivel raíz del JSON; los datos del cliente en `json['data']`.

7. **Throttle**: endpoints públicos 30/min, login 10/min.

8. **Caché dashboard**: 60 segundos (`Cache::remember`).

9. **nombre_servidor**: campo de `clientes_empresa` que identifica el sistema del operador (ej. "SIGA1"). Se muestra como badge en Clientes y Empresas en el panel web.
