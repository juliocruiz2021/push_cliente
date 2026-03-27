<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\ClienteEmpresa;
use App\Models\Mensaje;
use App\Services\FcmService;
use Illuminate\Http\Request;

class MensajeController extends Controller
{
    public function __construct(private FcmService $fcmService) {}

    public function enviar(Request $request)
    {
        $validated = $request->validate([
            'registro_iva'   => 'required|string|max:50',
            'numero_destino' => 'required|string|max:20',
            'titulo'         => 'required|string|max:200',
            'cuerpo'         => 'required|string|max:1000',
            'payload'        => 'nullable|array',
        ]);

        $empresa = Empresa::where('registro_iva', $validated['registro_iva'])
            ->where('activo', true)
            ->firstOrFail();

        $cliente = ClienteEmpresa::where('empresa_id', $empresa->id)
            ->where('numero_celular', $validated['numero_destino'])
            ->where('activo', true)
            ->firstOrFail();

        $mensaje = Mensaje::create([
            'empresa_id'         => $empresa->id,
            'cliente_empresa_id' => $cliente->id,
            'numero_destino'     => $validated['numero_destino'],
            'titulo'             => $validated['titulo'],
            'cuerpo'             => $validated['cuerpo'],
            'payload_json'       => $validated['payload'] ?? null,
            'estado'             => 'pendiente',
            'proveedor'          => 'fcm',
        ]);

        $resultado = $this->fcmService->enviarNotificacion($mensaje, $cliente);

        return response()->json([
            'message'    => $resultado['success'] ? 'Notificación enviada.' : 'Error al enviar.',
            'mensaje_id' => $mensaje->id,
            'estado'     => $mensaje->fresh()->estado,
            'error'      => $resultado['error'] ?? null,
        ], $resultado['success'] ? 200 : 422);
    }

    public function historial(Request $request)
    {
        $request->validate([
            'registro_iva' => 'required|string',
            'per_page'     => 'nullable|integer|min:1|max:100',
        ]);

        $empresa = Empresa::where('registro_iva', $request->registro_iva)
            ->where('activo', true)
            ->firstOrFail();

        $mensajes = Mensaje::where('empresa_id', $empresa->id)
            ->with('clienteEmpresa:id,nombre_usuario,numero_celular')
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 20);

        return response()->json($mensajes);
    }
}
