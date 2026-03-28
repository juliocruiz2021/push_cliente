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
            'registro_iva' => 'nullable|string',
            'estado'       => 'nullable|in:enviado,pendiente,fallido',
            'recepcion'    => 'nullable|in:confirmada,pendiente',
            'fecha_desde'  => 'nullable|date',
            'fecha_hasta'  => 'nullable|date',
            'search'       => 'nullable|string|max:100',
            'per_page'     => 'nullable|integer|min:1|max:100',
        ]);

        $query = Mensaje::with([
                'clienteEmpresa:id,nombre_usuario,nombre_servidor,numero_celular',
                'empresa:id,nombre',
            ])
            ->orderByDesc('created_at');

        if ($request->filled('registro_iva')) {
            $empresa = Empresa::where('registro_iva', $request->registro_iva)
                ->where('activo', true)
                ->firstOrFail();
            $query->where('empresa_id', $empresa->id);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('recepcion')) {
            if ($request->recepcion === 'confirmada') {
                $query->whereNotNull('recepcion_confirmada_at');
            } else {
                $query->whereNull('recepcion_confirmada_at');
            }
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('titulo', 'ilike', '%' . $request->search . '%')
                  ->orWhere('numero_destino', 'ilike', '%' . $request->search . '%')
                  ->orWhere('cuerpo', 'ilike', '%' . $request->search . '%');
            });
        }

        return response()->json($query->paginate($request->per_page ?? 20));
    }

    public function nuevos(Request $request)
    {
        $request->validate(['desde' => 'required|date']);

        $mensajes = Mensaje::with([
                'clienteEmpresa:id,nombre_usuario,nombre_servidor,numero_celular',
                'empresa:id,nombre',
            ])
            ->where('created_at', '>', $request->desde)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'count'    => $mensajes->count(),
            'mensajes' => $mensajes,
        ]);
    }
}
