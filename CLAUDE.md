# Claude Context - push_cliente

## What this repo is

`push_cliente` is the Laravel backend plus React admin panel used by the Flutter app `facturame`.

Production:
- Panel: `https://facturame.appsigasv.com`
- Public API: `https://facturame.appsigasv.com/api/v1`
- VPS: `138.197.36.98`
- Active branch: `feature/confirmacion-recepcion-limpieza`

## Current business rules

### Notification routing

- Devices are still stored in `clientes_empresa` with unique key `(empresa_id, numero_celular)`.
- Push delivery no longer filters by destination company.
- When sending, the backend resolves every active device with the same `numero_celular`, across companies.
- Repeated `fcm_token` values are deduplicated.
- A single phone can therefore receive notifications from multiple companies if the number matches.

### Receipt confirmation

- Receipt confirmation no longer depends on the sender company.
- It validates `mensaje_id + numero_celular`, and optionally `device_uuid`.

### Device management

- The web panel already supports manual create, edit and delete of registered devices from the `Clientes` module.

## Important production notes

- `facturame.appsigasv.com` is published by Apache reverse proxy in front of Nginx.
- Apache proxies:
  - panel to `127.0.0.1:8081`
  - API to `127.0.0.1:8082`
- Apache has ModSecurity enabled.
- To allow frontend `PUT` and `DELETE` calls under `/api/`, the production vhost excludes CRS rule `911100` for `/api/`.
- Do not touch the legacy site `appsigasv.com`.

## Important files

- `backend/app/Http/Controllers/Api/V1/ClienteController.php`
- `backend/app/Http/Controllers/Api/V1/MensajeController.php`
- `backend/app/Services/FcmService.php`
- `backend/routes/api.php`
- `frontend/src/pages/Clientes.jsx`
- `frontend/src/pages/Mensajes.jsx`
- `frontend/src/pages/Usuarios.jsx`

## Documentation to read first

- `README.md`
- `API.md`
- `PROJECT_CONTEXT.md`
- `CONTEXTO_CODEX.md`
- `DEPLOY_VPS.md`
- `PRUEBAS_FUNCIONALES.md`

## Current state already closed

- production HTTPS deployed
- admin users module
- device manual CRUD
- shared client sync
- receipt confirmation
- global routing by phone number
- APK generation script on mobile repo

## Safe next areas to improve

- offline queue strategy
- modularize large screens
- more functional tests
- better audit trail around cross-company routing

## Known local noise

These local paths may appear as untracked runtime files and should not be committed:

- `backend/bootstrap/cache/`
- `backend/public/.htaccess`
- `backend/public/favicon.ico`
- `backend/storage/`
