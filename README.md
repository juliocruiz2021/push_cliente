# Push Cliente

Sistema de envío de notificaciones push a clientes de múltiples empresas a través de Firebase Cloud Messaging (FCM).

## Descripción

Push Cliente es una plataforma backend + panel web que permite a empresas registradas enviar notificaciones push a sus usuarios móviles. Las aplicaciones móviles registran su token FCM en el sistema; desde el panel administrativo se pueden enviar mensajes individuales con payload personalizado.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Laravel 11 (PHP 8.2+) |
| Autenticación API | Laravel Sanctum (tokens Bearer) |
| Push Notifications | Firebase Cloud Messaging via `kreait/laravel-firebase` |
| Base de datos | PostgreSQL 14+ |
| Frontend | React 19 + Vite 6 |
| Estilos | Tailwind CSS 3 |
| Estado del servidor | TanStack Query v5 |
| Routing frontend | React Router DOM v7 |
| HTTP Client | Axios |

## Estructura del Proyecto

```
push_cliente/
├── backend/          Laravel 11 API
└── frontend/         React + Vite SPA
```

## Inicio Rápido

### Prerrequisitos

- PHP 8.2+ con extensiones: pdo_pgsql, mbstring, openssl, tokenizer, xml, ctype, json, bcmath
- Composer 2.x
- PostgreSQL 14+
- Node.js 20+ y npm
- Una cuenta de Firebase con proyecto configurado

### Backend

```bash
cd backend
cp .env.example .env
# Editar .env con credenciales reales
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
# Editar .env si el backend no está en localhost:8000
npm install
npm run dev
```

### Credenciales de Demo

| Campo | Valor |
|-------|-------|
| Email | admin@pushcliente.com |
| Password | Admin1234! |

## Documentación Adicional

- [Guía de instalación detallada](INSTALL.md)
- [Guía de despliegue en VPS](DEPLOY_VPS.md)
- [Referencia de la API](API.md)
- [Contexto del proyecto y arquitectura](PROJECT_CONTEXT.md)
- [Medidas de seguridad](SECURITY.md)
