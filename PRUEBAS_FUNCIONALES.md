# Pruebas funcionales

## Objetivo

Validar el flujo completo entre:

- panel web `facturame.appsigasv.com`
- backend `push_cliente`
- app movil `facturame`

## Prueba 1 - Login del panel

1. Abrir `https://facturame.appsigasv.com`
2. Iniciar sesion con un usuario admin valido
3. Confirmar que carga el dashboard

Resultado esperado:
- login exitoso
- menu lateral visible
- sin error interno del servidor

## Prueba 2 - CRUD manual de dispositivos

1. Entrar a `Clientes`
2. Confirmar que existe el boton `Nuevo dispositivo`
3. Crear un dispositivo manual
4. Editarlo
5. Eliminarlo

Resultado esperado:
- alta, edicion y eliminacion correctas
- mensajes de exito visibles
- sin errores 403 en `PUT` o `DELETE`

## Prueba 3 - Registro automatico desde la app

1. Abrir la app en Android
2. Configurar:
   - backend `https://facturame.appsigasv.com`
   - empresa
   - registro IVA
   - mi numero celular
3. Guardar y reabrir la app
4. Revisar en `Clientes` del panel

Resultado esperado:
- aparece el numero registrado
- el token FCM figura como `Registrado`

## Prueba 4 - Envio dentro de la misma empresa

1. En la app, enviar una notificacion a un numero registrado
2. Revisar el telefono destino
3. Abrir el detalle de la notificacion
4. Revisar `Mensajes` en el panel

Resultado esperado:
- el telefono destino recibe la notificacion
- el detalle muestra `empresa` y `servidor` correctos
- el panel marca la recepcion como `Confirmada`

## Prueba 5 - Enrutamiento global por numero

Objetivo:
- comprobar que el mismo telefono recibe mensajes de varias empresas si comparte el mismo numero

Preparacion:
1. Tener Empresa A y Empresa B
2. Tener el mismo `numero_celular` registrado en ambas
3. Si es el mismo telefono, registrar la misma app con ambas empresas en momentos distintos o crear el segundo registro manualmente desde `Clientes`

Ejecucion:
1. Enviar desde Empresa A a ese numero
2. Confirmar que el telefono recibe la notificacion
3. Enviar desde Empresa B al mismo numero
4. Confirmar que el mismo telefono tambien la recibe

Resultado esperado:
- el backend no filtra por empresa destino
- el telefono recibe mensajes de ambas empresas
- la UI muestra la empresa real tomada del JSON del mensaje

## Prueba 6 - Confirmacion de recepcion cruzada

Objetivo:
- comprobar que la recepcion se puede confirmar aunque el telefono este registrado en otra empresa

1. Hacer llegar una notificacion desde Empresa A al telefono
2. Abrir el detalle en ese telefono
3. Revisar el historial del panel

Resultado esperado:
- `recepcion_confirmada_at` se llena correctamente
- no falla por mismatch de empresa

## Prueba 7 - Sync de clientes compartidos

1. Crear o editar un cliente en la app de un dispositivo
2. Abrir la app en otro dispositivo de la misma empresa
3. Revisar la lista sincronizada
4. Revisar `Clientes` o la vista relacionada en el panel

Resultado esperado:
- ambos dispositivos ven el mismo cliente
- el backend consolida por `sync_id`

## Notas

- En este VPS, Apache usa ModSecurity delante del proxy. El vhost de `facturame.appsigasv.com` excluye la regla `911100` en `/api/` para permitir `PUT` y `DELETE`.
- El sitio productivo activo es `facturame.appsigasv.com`; no tocar el sitio legado `appsigasv.com`.
