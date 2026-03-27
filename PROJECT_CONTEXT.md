# Contexto del Proyecto

## Modelo de Negocio

Push Cliente es un sistema **multi-tenant** de notificaciones push. Cada **Empresa** tiene sus propios **Clientes** (usuarios de su aplicación móvil). Desde el panel web, los administradores del sistema envían notificaciones push a clientes específicos por número de celular.

### Flujo Principal

```
App Móvil del Cliente
        |
        | POST /clientes/registrar-dispositivo
        |  (registro_iva, numero_celular, fcm_token, plataforma)
        v
  Backend Laravel
        |
        | Busca empresa por registro_iva
        | updateOrCreate en clientes_empresa
        |
        v
  Base de Datos (PostgreSQL)

Panel Administrativo (React)
        |
        | POST /mensajes/enviar
        |  (registro_iva, numero_destino, titulo, cuerpo, payload)
        v
  Backend Laravel
        |
        | Valida empresa y cliente
        | Crea registro en mensajes (estado: pendiente)
        | FcmService::enviarNotificacion()
        |    -> kreait/laravel-firebase -> FCM API
        |    -> Actualiza estado: enviado / fallido
        v
  Dispositivo Móvil recibe la notificación
```

---

## Arquitectura

### Backend (Laravel 11)

```
backend/
├── app/
│   ├── Http/
│   │   └── Controllers/Api/V1/
│   │       ├── AuthController.php       # Login/logout/me
│   │       ├── ClienteController.php    # Registro de dispositivos
│   │       ├── DashboardController.php  # Estadísticas
│   │       ├── EmpresaController.php    # CRUD de empresas
│   │       └── MensajeController.php    # Envío e historial
│   ├── Models/
│   │   ├── AdminUser.php               # Usuario del panel (Sanctum)
│   │   ├── ClienteEmpresa.php          # Dispositivo registrado
│   │   ├── Empresa.php                 # Empresa cliente
│   │   ├── LogAuditoria.php            # Auditoría de acciones
│   │   └── Mensaje.php                 # Registro de envíos
│   └── Services/
│       └── FcmService.php              # Wrapper de Firebase FCM
├── bootstrap/app.php                   # Configuración y manejo de errores
├── config/cors.php                     # CORS para el frontend
└── routes/api.php                      # Rutas de la API v1
```

**Patrón:** Controladores delgados con lógica de negocio en Services. Los controladores validan la entrada, obtienen/crean modelos y delegan el envío al `FcmService`.

### Frontend (React + Vite)

```
frontend/src/
├── contexts/
│   └── AuthContext.jsx     # Estado de autenticación global
├── lib/
│   └── axios.js            # Instancia Axios con interceptores
├── components/
│   └── Layout.jsx          # Sidebar + header compartidos
└── pages/
    ├── Login.jsx            # Pantalla de login
    ├── Dashboard.jsx        # Métricas del sistema
    ├── Empresas.jsx         # CRUD de empresas con modal
    ├── Clientes.jsx         # Listado de clientes registrados
    └── Mensajes.jsx         # Envío de push + historial
```

**Patrón:** Context API para auth, TanStack Query para server state (cache, refetch, mutations). No hay Redux ni estado global extra.

---

## Modelo de Datos

```
empresas
├── id
├── registro_iva (unique)   ← Identificador de la empresa en la API
├── nombre
├── activo
└── timestamps

clientes_empresa
├── id
├── empresa_id → empresas.id (cascade delete)
├── numero_celular           ← Identificador del usuario en la empresa
├── nombre_usuario
├── device_uuid
├── fcm_token (text)         ← Token FCM actual del dispositivo
├── plataforma (enum: android|ios|web)
├── version_app
├── activo
└── timestamps
UNIQUE (empresa_id, numero_celular)

mensajes
├── id
├── empresa_id → empresas.id (cascade delete)
├── cliente_empresa_id → clientes_empresa.id (null on delete)
├── numero_destino           ← Copia desnormalizada por historicidad
├── titulo
├── cuerpo
├── payload_json (jsonb)     ← Datos adicionales para la app
├── estado (enum: pendiente|enviado|fallido)
├── proveedor                ← 'fcm' por ahora, extensible
├── enviado_at
└── timestamps
INDEX (empresa_id, estado, enviado_at)

admin_users
├── id
├── name
├── email (unique)
├── password (hashed)
└── timestamps

logs_auditoria
├── id
├── admin_user_id → admin_users.id (null on delete)
├── accion
├── descripcion
├── ip_address
├── user_agent
├── datos_antes (jsonb)
├── datos_despues (jsonb)
└── timestamps
```

---

## Decisiones de Arquitectura

### ¿Por qué PostgreSQL?
- Soporte nativo de `jsonb` para `payload_json`, `datos_antes`, `datos_despues`
- Índices GIN en columnas jsonb para búsquedas eficientes en el futuro
- Confiabilidad y soporte de transacciones ACID para operaciones críticas

### ¿Por qué Sanctum con tokens Bearer (no sesiones)?
- La API es consumida por un SPA y por futuras apps móviles / integraciones ERP
- Los tokens Bearer son stateless y fáciles de revocar individualmente
- No requieren cookies de sesión ni CSRF tokens para peticiones cross-origin

### ¿Por qué `registro_iva` como identificador externo?
- Los sistemas ERP de los clientes pueden llamar a la API sin conocer el `id` interno
- El RUC/NIT es un identificador de negocio estable y conocido
- Evita exponer IDs incrementales en integraciones externas

### ¿Por qué `numero_celular` como identificador de cliente?
- Los sistemas ERP identifican a sus usuarios por celular para comunicaciones
- Es el mismo identificador que usa WhatsApp/SMS, facilitando correlación
- La unicidad es por empresa, permitiendo el mismo número en diferentes empresas

### ¿Por qué guardar `numero_destino` en mensajes?
- Si un cliente es eliminado, el historial sigue siendo legible
- Permite auditoría sin depender de la existencia del cliente

### Extensibilidad de proveedores
- El campo `proveedor` en mensajes permite agregar soporte para OneSignal, APN directa u otros
- `FcmService` puede ser reemplazado/extendido con una interfaz común en el futuro

### Cache de Dashboard
- Las estadísticas se cachean 60 segundos para evitar queries costosas en cada carga
- Se invalidan automáticamente al expirar (TTL simple, sin invalidación manual)

---

## Limitaciones Actuales y Próximos Pasos

| Limitación | Solución Sugerida |
|------------|-------------------|
| Envío solo individual (un cliente a la vez) | Implementar envío masivo con `messaging->sendAll()` y Jobs de Laravel Queue |
| Sin websockets para estado en tiempo real | Integrar Laravel Reverb o Pusher para actualizaciones live en el panel |
| Panel de clientes sin endpoint GET dedicado | Agregar `ClienteController@index` con filtros por empresa |
| Sin programación de mensajes | Agregar campo `programado_at` y un Job programado |
| Sin métricas de apertura de notificaciones | Integrar webhook de FCM para delivery receipts |
