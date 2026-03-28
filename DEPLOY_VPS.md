# Despliegue en VPS

Guia base para montar `push_cliente` en un VPS Ubuntu de DigitalOcean y dejar la app `Facturame` apuntando al servidor en la nube.

## Topologia recomendada

- API Laravel: `https://api.tu-dominio.com`
- Panel React: `https://panel.tu-dominio.com`
- Base de datos PostgreSQL en el mismo VPS
- Credenciales Firebase en `backend/storage/app/firebase-credentials.json`

## Paquetes recomendados en Ubuntu

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib unzip git
sudo apt install -y php8.3 php8.3-cli php8.3-fpm php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## Backend

```bash
cd /var/www
git clone https://github.com/juliocruiz2021/push_cliente.git
cd push_cliente/backend
cp .env.example .env
composer install --no-dev --optimize-autoloader
php artisan key:generate
```

Variables sugeridas en `.env`:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.tu-dominio.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=push_cliente
DB_USERNAME=push_cliente
DB_PASSWORD=CAMBIAR_ESTO

FRONTEND_URL=https://panel.tu-dominio.com
CORS_ALLOWED_ORIGINS=https://panel.tu-dominio.com
SANCTUM_STATEFUL_DOMAINS=panel.tu-dominio.com

FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json
FIREBASE_PROJECT_ID=tu-project-id
```

Subir el JSON de Firebase a:

```bash
/var/www/push_cliente/backend/storage/app/firebase-credentials.json
```

Luego:

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

Permisos:

```bash
sudo chown -R www-data:www-data /var/www/push_cliente/backend
sudo find /var/www/push_cliente/backend -type f -exec chmod 644 {} \;
sudo find /var/www/push_cliente/backend -type d -exec chmod 755 {} \;
sudo chmod -R 775 /var/www/push_cliente/backend/storage /var/www/push_cliente/backend/bootstrap/cache
```

## Frontend

```bash
cd /var/www/push_cliente/frontend
cp .env.example .env
```

Contenido sugerido:

```env
VITE_API_URL=https://api.tu-dominio.com/api/v1
```

Build:

```bash
npm install
npm run build
```

Los archivos finales quedaran en:

```bash
/var/www/push_cliente/frontend/dist
```

## Nginx

### API

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;

    root /var/www/push_cliente/backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
}
```

### Panel

```nginx
server {
    listen 80;
    server_name panel.tu-dominio.com;

    root /var/www/push_cliente/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

Activacion:

```bash
sudo ln -s /etc/nginx/sites-available/push-cliente-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/push-cliente-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.tu-dominio.com -d panel.tu-dominio.com
```

## Si publicas por Apache reverse proxy + ModSecurity

En `facturame.appsigasv.com` se publico asi:

- Apache expone `80/443`
- Apache hace proxy al panel Nginx en `8081`
- Apache hace proxy a la API Nginx en `8082`

Importante:

- Si Apache tiene ModSecurity delante del proxy, `PUT` y `DELETE` pueden quedar bloqueados aunque Laravel y Nginx esten bien.
- En ese caso, habilita la API del subdominio quitando la regla CRS `911100` solo para `/api/`.

Ejemplo dentro del vhost Apache:

```apache
<IfModule security2_module>
    <LocationMatch "^/api/">
        SecRuleRemoveById 911100
    </LocationMatch>
</IfModule>
```

## APK con defaults de produccion

En `facturame` ya existe el script:

```powershell
.\scripts\build_release.ps1 `
  -BackendUrl 'https://api.tu-dominio.com' `
  -NombreEmpresa 'TU EMPRESA' `
  -NumRegistro '12345-6' `
  -NombreServidor 'SIGA1' `
  -CelularDestino '70001111'
```

Eso deja el APK con defaults embebidos y, si el celular esta conectado por USB, tambien lo instala.

## Antes de ejecutar en tu VPS real

Necesitamos estos datos:

- IP publica del VPS
- usuario SSH
- dominio o subdominios definitivos
- si el acceso sera con llave SSH o password
- JSON de Firebase del proyecto final
