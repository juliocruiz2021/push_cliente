# Push Cliente

Backend Laravel + panel React del sistema de notificaciones push que trabaja junto con la app Flutter `facturame`.

## Produccion actual

- Panel: `https://facturame.appsigasv.com`
- API publica: `https://facturame.appsigasv.com/api/v1`
- VPS: `138.197.36.98`
- Rama activa: `feature/confirmacion-recepcion-limpieza`

## Que resuelve hoy

- registro de dispositivos FCM
- envio de notificaciones desde la app movil
- envio de notificaciones desde el panel web
- historial de mensajes
- confirmacion de recepcion
- sincronizacion de clientes compartidos por empresa
- CRUD de empresas
- CRUD manual de dispositivos desde el frontend
- CRUD de usuarios administrativos

## Regla clave de negocio

El enrutamiento ya no depende de la empresa del dispositivo destino.

Hoy el backend:
- registra cada dispositivo por `(empresa_id, numero_celular)`
- busca destinos por `numero_celular` global
- envia a todos los dispositivos activos encontrados aunque pertenezcan a otras empresas
- deduplica tokens FCM repetidos

Esto permite que un mismo telefono reciba mensajes de varias empresas si comparte el mismo numero.

## Estructura

```text
push_cliente/
├── backend/    Laravel 11 API
└── frontend/   React + Vite SPA
```

## Stack

- Backend: Laravel 11 + PHP 8.4
- Auth: Sanctum con Bearer token
- Push: Firebase Cloud Messaging
- DB: PostgreSQL
- Frontend: React 19 + Vite + Tailwind CSS 3 + TanStack Query v5

## Inicio rapido local

### Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Documentacion importante

- [CLAUDE.md](CLAUDE.md)
- [API.md](API.md)
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- [CONTEXTO_CODEX.md](CONTEXTO_CODEX.md)
- [PRUEBAS_FUNCIONALES.md](PRUEBAS_FUNCIONALES.md)
- [DEPLOY_VPS.md](DEPLOY_VPS.md)
- [INSTALL.md](INSTALL.md)
- [SECURITY.md](SECURITY.md)

## Nota de infraestructura

En produccion, Apache publica `facturame.appsigasv.com` y hace reverse proxy hacia Nginx:

- panel en `8081`
- API en `8082`

Como Apache tiene ModSecurity delante del proxy, el vhost productivo excluye la regla CRS `911100` sobre `/api/` para permitir `PUT` y `DELETE` del frontend.
