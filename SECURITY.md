# Medidas de Seguridad

## 1. Autenticación con Laravel Sanctum

- Todos los endpoints del panel administrativo requieren un token Bearer válido (`auth:sanctum` middleware).
- Los tokens son de tipo **Personal Access Token** — cada login genera un token único vinculado al usuario.
- El logout invalida el token inmediatamente en base de datos (`currentAccessToken()->delete()`).
- Los tokens no tienen expiración predeterminada (se puede agregar `expiration` en `config/sanctum.php` si se requiere).
- El modelo `AdminUser` separa los usuarios administradores del sistema de eventuales usuarios finales.

## 2. Rate Limiting

Los endpoints sensibles tienen límites de peticiones configurados en las rutas:

| Endpoint | Límite |
|----------|--------|
| `POST /auth/login` | 10 req/min por IP |
| `POST /clientes/registrar-dispositivo` | 30 req/min por IP |

Esto protege contra ataques de fuerza bruta y abusos de registro masivo de dispositivos.

## 3. CORS Configurado

- La lista de orígenes permitidos se configura exclusivamente en la variable de entorno `FRONTEND_URL`.
- Solo se permite el origen del frontend legítimo; no se usa `*` (wildcard).
- Configurado en `config/cors.php` para todas las rutas `api/*`.

```php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
```

## 4. Sin Exposición de Errores Internos en Producción

El manejador de excepciones en `bootstrap/app.php` controla la respuesta según el entorno:

```php
'message' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor.',
'trace'   => config('app.debug') ? $e->getTrace() : null,
```

En producción (`APP_DEBUG=false`), los errores 500 devuelven únicamente el mensaje genérico, sin stack traces ni detalles internos.

## 5. Secretos en Variables de Entorno

Ningún secreto está hardcodeado en el código fuente:

- Credenciales de base de datos: `DB_*` en `.env`
- Credenciales Firebase: ruta al JSON en `FIREBASE_CREDENTIALS`
- Clave de aplicación: `APP_KEY` generada con `artisan key:generate`
- El archivo `.env` y `firebase-credentials.json` deben estar en `.gitignore`

```gitignore
.env
firebase-credentials.json
```

## 6. Protección contra Mass Assignment

Todos los modelos Eloquent usan la propiedad `$fillable` con lista explícita de campos permitidos. Laravel por defecto aplica protección contra mass assignment si `$guarded` o `$fillable` está presente.

## 7. Validación de Entrada

Todos los endpoints validan el input con `$request->validate()` antes de procesar:

- Tipos de datos, longitudes máximas
- Reglas de unicidad en base de datos (`unique:empresas,registro_iva`)
- Enums para `plataforma` (`in:android,ios,web`)
- JSON válido implícito mediante cast `array` en el modelo

## 8. Manejo Seguro de Tokens FCM Inválidos

Cuando Firebase devuelve un error de token inválido (`InvalidMessage`), el sistema:

1. Registra el error en los logs del servidor
2. Elimina el `fcm_token` del cliente en base de datos (`fcm_token = null`)
3. Marca el mensaje como `fallido`

Esto evita acumulación de tokens muertos y cumple con las buenas prácticas de Firebase.

## 9. Auditoría de Acciones

Las operaciones críticas sobre empresas (crear, actualizar, eliminar) se registran en `logs_auditoria` con:

- ID del usuario administrador que realizó la acción
- IP de origen
- User-Agent
- Estado del registro antes y después del cambio (campos `datos_antes` / `datos_despues`)

## 10. Separación de Endpoints Públicos y Privados

La API tiene una separación clara:

| Tipo | Endpoints | Autenticación |
|------|-----------|---------------|
| Público (app móvil) | `POST /clientes/registrar-dispositivo` | Ninguna (solo rate limit) |
| Público | `POST /auth/login` | Ninguna (solo rate limit) |
| Privado (panel admin) | Todo lo demás | Bearer token Sanctum |

Los endpoints públicos no exponen datos sensibles; solo permiten el registro/actualización del token FCM.

## 11. Contraseñas con Hash Seguro

Las contraseñas de `AdminUser` se almacenan con el cast `hashed` de Laravel 11, que usa `bcrypt` con 12 rondas de trabajo (`BCRYPT_ROUNDS=12` en `.env`).

## Checklist para Producción

- [ ] `APP_DEBUG=false` en `.env`
- [ ] `APP_ENV=production` en `.env`
- [ ] `.env` y `firebase-credentials.json` en `.gitignore`
- [ ] HTTPS configurado en el servidor web
- [ ] `FRONTEND_URL` apunta al dominio real (no `localhost`)
- [ ] `SANCTUM_STATEFUL_DOMAINS` actualizado al dominio real
- [ ] Contraseña del admin por defecto cambiada
- [ ] Backups automáticos de base de datos configurados
- [ ] Rotación periódica de credenciales de Firebase
