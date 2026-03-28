<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClienteEmpresa;
use App\Models\Empresa;
use App\Models\LogAuditoria;
use App\Models\Mensaje;
use App\Services\FcmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ClienteController extends Controller
{
    /**
     * List clients, optionally filtered by empresa_id.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'empresa_id' => 'nullable|integer|exists:empresas,id',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = ClienteEmpresa::with('empresa:id,nombre,registro_iva')
            ->orderByDesc('created_at');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->filled('search')) {
            $search = '%' . mb_strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(nombre_usuario) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(numero_celular) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(nombre_servidor, \'\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(device_uuid, \'\')) LIKE ?', [$search]);
            });
        }

        return response()->json($query->paginate($request->per_page ?? 20));
    }

    /**
     * Manual device registration from the web panel.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empresa_id' => 'required|integer|exists:empresas,id',
            'numero_celular' => [
                'required',
                'string',
                'max:20',
                Rule::unique('clientes_empresa')->where(
                    fn ($query) => $query->where('empresa_id', $request->integer('empresa_id'))
                ),
            ],
            'nombre_usuario' => 'required|string|max:150',
            'nombre_servidor' => 'nullable|string|max:150',
            'device_uuid' => 'nullable|string|max:100',
            'fcm_token' => 'nullable|string',
            'plataforma' => 'nullable|in:android,ios,web',
            'version_app' => 'nullable|string|max:20',
            'activo' => 'nullable|boolean',
        ]);

        $cliente = ClienteEmpresa::create([
            'empresa_id' => $validated['empresa_id'],
            'numero_celular' => $validated['numero_celular'],
            'nombre_usuario' => $validated['nombre_usuario'],
            'nombre_servidor' => $validated['nombre_servidor'] ?? null,
            'device_uuid' => $validated['device_uuid'] ?? null,
            'fcm_token' => $validated['fcm_token'] ?? null,
            'plataforma' => $validated['plataforma'] ?? 'android',
            'version_app' => $validated['version_app'] ?? null,
            'activo' => $validated['activo'] ?? true,
        ]);

        LogAuditoria::registrar(
            accion: 'cliente_empresa.creado',
            descripcion: "Dispositivo creado: {$cliente->numero_celular}",
            datosDespues: $cliente->toArray(),
            request: $request,
            adminUserId: $request->user()?->id
        );

        return response()->json([
            'message' => 'Dispositivo creado correctamente.',
            'cliente' => $cliente->load('empresa:id,nombre,registro_iva'),
        ], 201);
    }

    /**
     * Update a device from the web panel.
     */
    public function update(Request $request, ClienteEmpresa $cliente): JsonResponse
    {
        $empresaId = (int) $request->input('empresa_id', $cliente->empresa_id);

        $validated = $request->validate([
            'empresa_id' => 'sometimes|required|integer|exists:empresas,id',
            'numero_celular' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('clientes_empresa')
                    ->ignore($cliente->id)
                    ->where(fn ($query) => $query->where('empresa_id', $empresaId)),
            ],
            'nombre_usuario' => 'sometimes|required|string|max:150',
            'nombre_servidor' => 'nullable|string|max:150',
            'device_uuid' => 'nullable|string|max:100',
            'fcm_token' => 'nullable|string',
            'plataforma' => 'nullable|in:android,ios,web',
            'version_app' => 'nullable|string|max:20',
            'activo' => 'nullable|boolean',
        ]);

        $datosAntes = $cliente->toArray();
        $cliente->update($validated);

        LogAuditoria::registrar(
            accion: 'cliente_empresa.actualizado',
            descripcion: "Dispositivo actualizado: {$cliente->numero_celular}",
            datosAntes: $datosAntes,
            datosDespues: $cliente->fresh()->toArray(),
            request: $request,
            adminUserId: $request->user()?->id
        );

        return response()->json([
            'message' => 'Dispositivo actualizado correctamente.',
            'cliente' => $cliente->fresh()->load('empresa:id,nombre,registro_iva'),
        ]);
    }

    /**
     * Delete a device from the web panel.
     */
    public function destroy(Request $request, ClienteEmpresa $cliente): JsonResponse
    {
        $datosAntes = $cliente->toArray();
        $cliente->delete();

        LogAuditoria::registrar(
            accion: 'cliente_empresa.eliminado',
            descripcion: "Dispositivo eliminado: {$datosAntes['numero_celular']}",
            datosAntes: $datosAntes,
            request: $request,
            adminUserId: $request->user()?->id
        );

        return response()->json([
            'message' => 'Dispositivo eliminado correctamente.',
        ]);
    }

    public function registrarDispositivo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registro_iva' => 'required|string|max:50',
            'numero_celular' => 'required|string|max:20',
            'nombre_usuario' => 'required|string|max:150',
            'nombre_servidor' => 'nullable|string|max:150',
            'device_uuid' => 'nullable|string|max:100',
            'fcm_token' => 'required|string',
            'plataforma' => 'nullable|in:android,ios,web',
            'version_app' => 'nullable|string|max:20',
        ]);

        $empresa = Empresa::where('registro_iva', $validated['registro_iva'])
            ->where('activo', true)
            ->firstOrFail();

        $cliente = ClienteEmpresa::updateOrCreate(
            [
                'empresa_id' => $empresa->id,
                'numero_celular' => $validated['numero_celular'],
            ],
            [
                'nombre_usuario' => $validated['nombre_usuario'],
                'nombre_servidor' => $validated['nombre_servidor'] ?? null,
                'device_uuid' => $validated['device_uuid'] ?? null,
                'fcm_token' => $validated['fcm_token'],
                'plataforma' => $validated['plataforma'] ?? 'android',
                'version_app' => $validated['version_app'] ?? null,
                'activo' => true,
            ]
        );

        return response()->json([
            'message' => 'Dispositivo registrado correctamente.',
            'cliente_id' => $cliente->id,
        ], 201);
    }

    public function enviarDatos(Request $request): JsonResponse
    {
        Log::info('enviarDatos request: ' . json_encode($request->all()));

        $validated = $request->validate([
            'registro_iva' => 'required|string|max:50',
            'numero_destino' => 'required|string|max:20',
            'titulo' => 'required|string|max:200',
            'cuerpo' => 'required|string|max:4000',
        ]);

        $empresa = Empresa::where('registro_iva', $validated['registro_iva'])
            ->where('activo', true)
            ->firstOrFail();

        $destinos = $this->resolverDestinosPorNumero($empresa, $validated['numero_destino']);
        if ($destinos->isEmpty()) {
            return response()->json([
                'message' => 'No hay dispositivos activos registrados para este numero.',
            ], 404);
        }

        $clientePrincipal = $this->resolverClientePrincipal($destinos, $empresa);

        $mensaje = Mensaje::create([
            'empresa_id' => $empresa->id,
            'cliente_empresa_id' => $clientePrincipal?->id,
            'numero_destino' => $validated['numero_destino'],
            'titulo' => $validated['titulo'],
            'cuerpo' => $validated['cuerpo'],
            'payload_json' => null,
            'estado' => 'pendiente',
            'proveedor' => 'fcm',
        ]);

        try {
            $fcmService = app(FcmService::class);
            $resultado = $fcmService->enviarNotificacionAMultiples($mensaje, $destinos);
        } catch (\Throwable $e) {
            Log::error('FcmService error: ' . $e->getMessage());
            $resultado = [
                'success' => false,
                'sent' => 0,
                'failed' => 0,
                'error' => 'FCM no configurado',
            ];
            $mensaje->update(['estado' => 'fallido']);
        }

        return response()->json([
            'message' => $resultado['success']
                ? 'Datos recibidos y notificacion enviada.'
                : 'Datos recibidos. Error al enviar push.',
            'mensaje_id' => $mensaje->id,
            'estado' => $mensaje->fresh()->estado,
            'dispositivos_notificados' => $resultado['sent'] ?? 0,
        ], 200);
    }

    public function confirmarRecepcion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mensaje_id' => 'required|integer|exists:mensajes,id',
            'registro_iva' => 'nullable|string|max:50',
            'numero_celular' => 'required|string|max:20',
            'device_uuid' => 'nullable|string|max:100',
        ]);

        $mensaje = Mensaje::findOrFail($validated['mensaje_id']);

        if ($mensaje->numero_destino !== $validated['numero_celular']) {
            return response()->json([
                'message' => 'Este dispositivo no corresponde al destinatario del mensaje.',
            ], 403);
        }

        $dispositivoRegistrado = ClienteEmpresa::where('numero_celular', $validated['numero_celular'])
            ->where('activo', true)
            ->when(
                !empty($validated['device_uuid']),
                fn ($query) => $query->where(function ($inner) use ($validated) {
                    $inner->where('device_uuid', $validated['device_uuid'])
                        ->orWhereNull('device_uuid');
                })
            )
            ->exists();

        if (! $dispositivoRegistrado) {
            return response()->json([
                'message' => 'Este numero no tiene un dispositivo activo registrado.',
            ], 403);
        }

        if ($mensaje->recepcion_confirmada_at) {
            return response()->json([
                'message' => 'La recepcion ya estaba confirmada.',
                'mensaje_id' => $mensaje->id,
                'recepcion_confirmada_at' => $mensaje->recepcion_confirmada_at,
            ]);
        }

        $mensaje->update([
            'recepcion_confirmada_at' => now(),
            'recepcion_confirmada_por' => $validated['numero_celular'],
            'recepcion_device_uuid' => $validated['device_uuid'] ?? null,
        ]);

        return response()->json([
            'message' => 'Recepcion confirmada correctamente.',
            'mensaje_id' => $mensaje->id,
            'recepcion_confirmada_at' => $mensaje->fresh()->recepcion_confirmada_at,
        ]);
    }

    private function resolverDestinosPorNumero(Empresa $empresa, string $numeroDestino): Collection
    {
        return ClienteEmpresa::with('empresa:id,nombre,registro_iva')
            ->where('numero_celular', $numeroDestino)
            ->where('activo', true)
            ->orderByRaw('CASE WHEN empresa_id = ? THEN 0 ELSE 1 END', [$empresa->id])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();
    }

    private function resolverClientePrincipal(Collection $destinos, Empresa $empresa): ?ClienteEmpresa
    {
        return $destinos->firstWhere('empresa_id', $empresa->id) ?? $destinos->first();
    }
}
