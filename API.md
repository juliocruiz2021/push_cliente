# Referencia de la API

Base URL: `http://localhost:8000/api/v1`

Todos los endpoints devuelven `Content-Type: application/json`.

Los endpoints protegidos requieren el header:
```
Authorization: Bearer {token}
```

---

## Autenticación

### POST `/auth/login`

Autentica un usuario administrador y devuelve un token Bearer.

**Rate limit:** 10 peticiones por minuto.

**Request:**
```json
{
  "email": "admin@pushcliente.com",
  "password": "Admin1234!"
}
```

**Response 200:**
```json
{
  "token": "1|abc123...",
  "user": {
    "id": 1,
    "name": "Administrador",
    "email": "admin@pushcliente.com"
  }
}
```

**Response 422 (credenciales incorrectas):**
```json
{
  "message": "Los datos proporcionados no son válidos.",
  "errors": {
    "email": ["Credenciales incorrectas."]
  }
}
```

---

### POST `/auth/logout`

Invalida el token actual. Requiere autenticación.

**Response 200:**
```json
{
  "message": "Sesión cerrada."
}
```

---

### GET `/auth/me`

Devuelve el usuario autenticado. Requiere autenticación.

**Response 200:**
```json
{
  "id": 1,
  "name": "Administrador",
  "email": "admin@pushcliente.com",
  "created_at": "2024-01-01T00:00:00.000000Z"
}
```

---

## Clientes (App Móvil)

### POST `/clientes/registrar-dispositivo`

Registra o actualiza el token FCM de un dispositivo móvil. Endpoint público, sin autenticación.

**Rate limit:** 30 peticiones por minuto.

**Request:**
```json
{
  "registro_iva": "12345-6",
  "numero_celular": "+59170000000",
  "nombre_usuario": "Juan Pérez",
  "device_uuid": "uuid-del-dispositivo",
  "fcm_token": "FCM_TOKEN_LARGO_DEL_DISPOSITIVO",
  "plataforma": "android",
  "version_app": "1.0.0"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `registro_iva` | string | Sí | RUC/NIT de la empresa (debe existir y estar activa) |
| `numero_celular` | string | Sí | Identificador único del usuario en la empresa |
| `nombre_usuario` | string | Sí | Nombre para mostrar |
| `device_uuid` | string | No | UUID del dispositivo |
| `fcm_token` | string | Sí | Token FCM del dispositivo |
| `plataforma` | enum | No | `android`, `ios`, `web` (default: `android`) |
| `version_app` | string | No | Versión de la app móvil |

**Response 201:**
```json
{
  "message": "Dispositivo registrado correctamente.",
  "cliente_id": 42
}
```

**Response 404 (empresa no encontrada o inactiva):**
```json
{
  "message": "Recurso Empresa no encontrado."
}
```

---

## Dashboard

### GET `/dashboard`

Devuelve estadísticas generales. Requiere autenticación. Respuesta cacheada por 60 segundos.

**Response 200:**
```json
{
  "empresas_activas": 3,
  "clientes_activos": 127,
  "mensajes_hoy": 45,
  "mensajes_fallidos": 2
}
```

---

## Empresas

### GET `/empresas`

Lista empresas con paginación. Requiere autenticación.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | int | Número de página (default: 1) |
| `per_page` | int | Resultados por página (default: 20) |
| `search` | string | Buscar por nombre o registro_iva |
| `activo` | boolean | Filtrar por estado |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "registro_iva": "12345-6",
      "nombre": "EMPRESA DE PRUEBA",
      "activo": true,
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": { "first": "...", "last": "...", "prev": null, "next": null },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "per_page": 20,
    "to": 1,
    "total": 1
  }
}
```

---

### POST `/empresas`

Crea una nueva empresa. Requiere autenticación.

**Request:**
```json
{
  "registro_iva": "98765-4",
  "nombre": "MI EMPRESA S.A.",
  "activo": true
}
```

**Response 201:**
```json
{
  "message": "Empresa creada correctamente.",
  "empresa": {
    "id": 2,
    "registro_iva": "98765-4",
    "nombre": "MI EMPRESA S.A.",
    "activo": true,
    "created_at": "2024-01-15T10:00:00.000000Z",
    "updated_at": "2024-01-15T10:00:00.000000Z"
  }
}
```

**Response 422 (registro_iva duplicado):**
```json
{
  "message": "Los datos proporcionados no son válidos.",
  "errors": {
    "registro_iva": ["The registro iva has already been taken."]
  }
}
```

---

### GET `/empresas/{id}`

Obtiene una empresa por ID. Incluye contadores de clientes y mensajes. Requiere autenticación.

**Response 200:**
```json
{
  "id": 1,
  "registro_iva": "12345-6",
  "nombre": "EMPRESA DE PRUEBA",
  "activo": true,
  "clientes_count": 15,
  "mensajes_count": 87,
  "created_at": "2024-01-01T00:00:00.000000Z",
  "updated_at": "2024-01-01T00:00:00.000000Z"
}
```

---

### PUT `/empresas/{id}`

Actualiza una empresa. Requiere autenticación.

**Request:** (todos los campos son opcionales)
```json
{
  "nombre": "EMPRESA ACTUALIZADA S.A.",
  "activo": false
}
```

**Response 200:**
```json
{
  "message": "Empresa actualizada correctamente.",
  "empresa": { ... }
}
```

---

### DELETE `/empresas/{id}`

Elimina una empresa. Requiere autenticación.

> **Advertencia:** Eliminar una empresa elimina en cascada todos sus clientes. Los mensajes quedan con `empresa_id` y `cliente_empresa_id` en NULL.

**Response 200:**
```json
{
  "message": "Empresa eliminada correctamente."
}
```

---

## Mensajes

### POST `/mensajes/enviar`

Envía una notificación push a un cliente. Requiere autenticación.

**Request:**
```json
{
  "registro_iva": "12345-6",
  "numero_destino": "+59170000000",
  "titulo": "Pago recibido",
  "cuerpo": "Su pago de Bs. 500 fue procesado correctamente.",
  "payload": {
    "orden_id": "ORD-2024-001",
    "tipo": "pago",
    "monto": "500"
  }
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `registro_iva` | string | Sí | RUC de la empresa |
| `numero_destino` | string | Sí | Número de celular del cliente destino |
| `titulo` | string | Sí | Título de la notificación (máx. 200 chars) |
| `cuerpo` | string | Sí | Cuerpo del mensaje (máx. 1000 chars) |
| `payload` | object | No | Datos adicionales enviados al dispositivo |

**Response 200 (enviado exitosamente):**
```json
{
  "message": "Notificación enviada.",
  "mensaje_id": 101,
  "estado": "enviado",
  "error": null
}
```

**Response 422 (error de envío FCM):**
```json
{
  "message": "Error al enviar.",
  "mensaje_id": 102,
  "estado": "fallido",
  "error": "Token inválido, fue eliminado"
}
```

**Response 404 (cliente no registrado o empresa inactiva):**
```json
{
  "message": "Recurso ClienteEmpresa no encontrado."
}
```

---

### GET `/mensajes/historial`

Lista el historial de mensajes de una empresa. Requiere autenticación.

**Query params:**
| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `registro_iva` | string | Sí | RUC de la empresa |
| `per_page` | int | No | Resultados por página (default: 20, máx: 100) |
| `page` | int | No | Número de página |

**Response 200:**
```json
{
  "data": [
    {
      "id": 101,
      "empresa_id": 1,
      "cliente_empresa_id": 42,
      "numero_destino": "+59170000000",
      "titulo": "Pago recibido",
      "cuerpo": "Su pago fue procesado.",
      "payload_json": { "orden_id": "ORD-001" },
      "estado": "enviado",
      "proveedor": "fcm",
      "enviado_at": "2024-01-15T10:05:00.000000Z",
      "created_at": "2024-01-15T10:04:58.000000Z",
      "cliente_empresa": {
        "id": 42,
        "nombre_usuario": "Juan Pérez",
        "numero_celular": "+59170000000"
      }
    }
  ],
  "meta": { "current_page": 1, "last_page": 5, "total": 87 }
}
```

---

## Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| 401 | Token no proporcionado o inválido |
| 404 | Recurso no encontrado |
| 422 | Error de validación o negocio |
| 429 | Rate limit excedido |
| 500 | Error interno del servidor |
