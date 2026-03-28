# Guía de Instalación

## Requisitos del Sistema

### PHP
- PHP 8.2 o superior
- Extensiones requeridas:
  - `pdo_pgsql` — conexión a PostgreSQL
  - `mbstring` — manejo de strings multibyte
  - `openssl` — cifrado
  - `tokenizer` — tokenización de PHP
  - `xml` — procesamiento XML
  - `ctype` — funciones de tipo de caracter
  - `json` — soporte JSON
  - `bcmath` — matemáticas de precisión arbitraria
  - `fileinfo` — detección de tipo de archivos

### Sistema
- Composer 2.x
- PostgreSQL 14+
- Node.js 20+ con npm 10+

### Firebase
- Cuenta de Google con acceso a Firebase Console
- Proyecto Firebase creado con Cloud Messaging habilitado
- Archivo de credenciales de cuenta de servicio (JSON)

---

## 1. Configuración de PostgreSQL

Crear la base de datos y el usuario:

```sql
CREATE DATABASE push_cliente;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'sigaerp_pass';
GRANT ALL PRIVILEGES ON DATABASE push_cliente TO postgres;
```

O si ya existe el usuario `postgres`, simplemente crear la base de datos:

```sql
CREATE DATABASE push_cliente;
```

---

## 2. Configuración del Backend (Laravel 11)

### 2.1 Instalar dependencias

```bash
cd D:\Desarrollo_Flutter\push_cliente\backend
composer install
```

### 2.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores correctos:

```env
APP_NAME=PushCliente
APP_ENV=local
APP_KEY=                         # Se genera en el siguiente paso
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=push_cliente
DB_USERNAME=postgres
DB_PASSWORD=tu_password_real

SANCTUM_STATEFUL_DOMAINS=localhost:5200

FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json
FIREBASE_PROJECT_ID=tu-project-id-de-firebase

FRONTEND_URL=http://localhost:5200
CORS_ALLOWED_ORIGINS=http://localhost:5200,http://localhost:5173
```

### 2.3 Generar clave de aplicación

```bash
php artisan key:generate
```

### 2.4 Ejecutar migraciones

```bash
php artisan migrate
```

Esto crea las tablas:
- `empresas`
- `clientes_empresa`
- `mensajes`
- `admin_users`
- `logs_auditoria`
- `personal_access_tokens` (Sanctum)

### 2.5 Ejecutar seeders

```bash
php artisan db:seed
```

Crea:
- Usuario admin: `admin@pushcliente.com` / `Admin1234!`
- Empresa demo: `EMPRESA DE PRUEBA` (registro IVA: `12345-6`)

### 2.6 Configurar Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar el proyecto
3. Ir a **Configuración del proyecto** > **Cuentas de servicio**
4. Hacer clic en **Generar nueva clave privada**
5. Descargar el archivo JSON
6. Copiar el archivo descargado a `backend/firebase-credentials.json`
7. Actualizar `FIREBASE_PROJECT_ID` en `.env` con el ID del proyecto Firebase

### 2.7 Iniciar el servidor de desarrollo

```bash
php artisan serve
# El servidor inicia en http://localhost:8000
```

Para producción, configurar un virtualhost en Apache/Nginx apuntando al directorio `public/`.

---

## 3. Configuración del Frontend (React + Vite)

### 3.1 Instalar dependencias

```bash
cd D:\Desarrollo_Flutter\push_cliente\frontend
npm install
```

### 3.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Si el backend no está en `localhost:8000`, editar `.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 3.3 Iniciar el servidor de desarrollo

```bash
npm run dev
# El servidor inicia en http://localhost:5200
```

### 3.4 Build para producción

```bash
npm run build
# Los archivos compilados quedan en dist/
```

---

## 4. Verificación de la Instalación

1. Abrir `http://localhost:5200` en el navegador
2. Iniciar sesión con `admin@pushcliente.com` / `Admin1234!`
3. El Dashboard debe mostrar estadísticas en 0 (base de datos vacía excepto la empresa demo)
4. Navegar a **Empresas** — debe aparecer "EMPRESA DE PRUEBA"

---

## 5. Configuración para Producción

### Variables de entorno adicionales

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-dominio.com

SANCTUM_STATEFUL_DOMAINS=tu-frontend.com
FRONTEND_URL=https://tu-frontend.com
CORS_ALLOWED_ORIGINS=https://tu-frontend.com
```

### Optimizaciones Laravel

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### Configuración del servidor web

Para Apache, el `.htaccess` en `public/` ya está incluido con Laravel.

Para Nginx, agregar la configuración:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /ruta/al/backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

---

## Solución de Problemas Comunes

| Problema | Solución |
|----------|----------|
| `SQLSTATE[08006]` | Verificar credenciales de PostgreSQL y que el servicio esté corriendo |
| `Class 'Kreait\Firebase\Factory' not found` | Ejecutar `composer install` nuevamente |
| Error CORS en el frontend | Verificar `FRONTEND_URL` en `.env` y reiniciar `php artisan serve` |
| Token FCM inválido | El token del dispositivo ha expirado; la app móvil debe re-registrarse |
| `401 Unauthenticated` | El token Sanctum expiró; cerrar sesión y volver a ingresar |
