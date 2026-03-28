# Referencia de la API

## Base URL

- Produccion: `https://facturame.appsigasv.com/api/v1`
- Local: `http://localhost:8000/api/v1`

Todos los endpoints responden JSON.

Los endpoints protegidos requieren:

```http
Authorization: Bearer {token}
```

## Auth

### POST `/auth/login`

Autentica un administrador del panel.

Request:

```json
{
  "email": "juliocruiz@yahoo.com",
  "password": "Zabpod1932$43"
}
```

Response 200:

```json
{
  "token": "1|abc...",
  "user": {
    "id": 1,
    "name": "Administrador",
    "email": "juliocruiz@yahoo.com"
  }
}
```

### POST `/auth/logout`

Invalida el token actual.

### GET `/auth/me`

Devuelve el usuario autenticado.

## App movil - endpoints publicos

### POST `/clientes/registrar-dispositivo`

Registra o actualiza un dispositivo por llave `(empresa_id, numero_celular)`.

Request:

```json
{
  "registro_iva": "12345-6",
  "numero_celular": "70001111",
  "nombre_usuario": "OPERADOR 1",
  "nombre_servidor": "SIGA1",
  "device_uuid": "uuid-del-dispositivo",
  "fcm_token": "token-fcm",
  "plataforma": "android",
  "version_app": "1.1.0"
}
```

Response 201:

```json
{
  "message": "Dispositivo registrado correctamente.",
  "cliente_id": 42
}
```

### POST `/clientes/enviar-datos`

Recibe un envio desde la app Flutter.

Regla actual:
- busca todos los dispositivos activos con `numero_celular = numero_destino`
- no filtra por empresa destino
- deduplica `fcm_token` repetidos
- crea un solo registro en `mensajes`

Request:

```json
{
  "registro_iva": "12345-6",
  "numero_destino": "70001111",
  "titulo": "Nuevo cliente",
  "cuerpo": "{\"empresa\":\"EMPRESA A\",\"servidor\":\"SIGA1\",\"data\":{\"nombre\":\"JUAN PEREZ\"}}"
}
```

Response 200:

```json
{
  "message": "Datos recibidos y notificacion enviada.",
  "mensaje_id": 15,
  "estado": "enviado",
  "dispositivos_notificados": 2
}
```

### POST `/clientes/confirmar-recepcion`

Confirma que el destinatario abrio el detalle.

Regla actual:
- valida `mensaje_id`
- valida que `numero_celular` coincida con `mensajes.numero_destino`
- valida que exista un dispositivo activo con ese numero
- ya no depende de la empresa emisora

Request:

```json
{
  "mensaje_id": 15,
  "registro_iva": "12345-6",
  "numero_celular": "70001111",
  "device_uuid": "uuid-del-dispositivo"
}
```

`registro_iva` se mantiene por compatibilidad, pero ya no define la autorizacion de la confirmacion.

Response 200:

```json
{
  "message": "Recepcion confirmada correctamente.",
  "mensaje_id": 15,
  "recepcion_confirmada_at": "2026-03-28T03:20:00.000000Z"
}
```

### POST `/clientes-compartidos/sync`

Sincroniza clientes compartidos por empresa.

### GET `/clientes-compartidos`

Devuelve clientes compartidos filtrables por empresa y busqueda.

## Panel web - endpoints protegidos

### Dashboard

- `GET /dashboard`

### Empresas

- `GET /empresas`
- `POST /empresas`
- `PUT /empresas/{id}`
- `DELETE /empresas/{id}`

Campos principales:

```json
{
  "nombre": "EMPRESA DE PRUEBA",
  "registro_iva": "12345-6",
  "nombre_servidor": "SIGA1",
  "activo": true
}
```

### Clientes / dispositivos

- `GET /clientes`
- `POST /clientes`
- `PUT /clientes/{cliente}`
- `DELETE /clientes/{cliente}`

Estos endpoints alimentan el modulo `Clientes` del frontend y permiten alta manual de dispositivos.

Request de creacion:

```json
{
  "empresa_id": 1,
  "numero_celular": "70001111",
  "nombre_usuario": "OPERADOR 1",
  "nombre_servidor": "SIGA1",
  "device_uuid": "uuid-del-dispositivo",
  "fcm_token": "token-fcm-opcional",
  "plataforma": "android",
  "version_app": "1.1.0",
  "activo": true
}
```

Response 201:

```json
{
  "message": "Dispositivo creado correctamente.",
  "cliente": {
    "id": 42,
    "empresa_id": 1,
    "numero_celular": "70001111",
    "nombre_usuario": "OPERADOR 1",
    "activo": true
  }
}
```

### Mensajes

- `POST /mensajes/enviar`
- `GET /mensajes/historial`
- `GET /mensajes/nuevos`

`POST /mensajes/enviar` usa la misma logica global por `numero_destino` que el endpoint publico de la app.

### Usuarios del panel

- `GET /admin-users`
- `POST /admin-users`
- `PUT /admin-users/{adminUser}`
- `DELETE /admin-users/{adminUser}`

## Notas operativas

- El frontend publicado en `facturame.appsigasv.com` usa estos endpoints sobre el mismo origen.
- En este VPS, Apache tiene ModSecurity delante del proxy; el vhost de `facturame.appsigasv.com` excluye la regla `911100` en `/api/` para permitir `PUT` y `DELETE`.
- El sitio productivo legado `appsigasv.com` no se toca; `facturame.appsigasv.com` corre separado.
