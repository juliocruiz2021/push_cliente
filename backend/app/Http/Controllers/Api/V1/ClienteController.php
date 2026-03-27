<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\ClienteEmpresa;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    /**
     * List clients, optionally filtered by empresa_id.
     */
    public function index(Request $request)
    {
        $request->validate([
            'empresa_id' => 'nullable|integer|exists:empresas,id',
            'search'     => 'nullable|string|max:100',
            'per_page'   => 'nullable|integer|min:1|max:100',
        ]);

        $query = ClienteEmpresa::with('empresa:id,nombre,registro_iva')
            ->orderByDesc('created_at');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('nombre_usuario', 'ilike', '%' . $request->search . '%')
                  ->orWhere('numero_celular', 'ilike', '%' . $request->search . '%');
            });
        }

        return response()->json($query->paginate($request->per_page ?? 20));
    }

    public function registrarDispositivo(Request $request)
    {
        $validated = $request->validate([
            'registro_iva'   => 'required|string|max:50',
            'numero_celular' => 'required|string|max:20',
            'nombre_usuario' => 'required|string|max:150',
            'device_uuid'    => 'nullable|string|max:100',
            'fcm_token'      => 'required|string',
            'plataforma'     => 'nullable|in:android,ios,web',
            'version_app'    => 'nullable|string|max:20',
        ]);

        $empresa = Empresa::where('registro_iva', $validated['registro_iva'])
            ->where('activo', true)
            ->firstOrFail();

        $cliente = ClienteEmpresa::updateOrCreate(
            [
                'empresa_id'     => $empresa->id,
                'numero_celular' => $validated['numero_celular'],
            ],
            [
                'nombre_usuario' => $validated['nombre_usuario'],
                'device_uuid'    => $validated['device_uuid'] ?? null,
                'fcm_token'      => $validated['fcm_token'],
                'plataforma'     => $validated['plataforma'] ?? 'android',
                'version_app'    => $validated['version_app'] ?? null,
                'activo'         => true,
            ]
        );

        return response()->json([
            'message'    => 'Dispositivo registrado correctamente.',
            'cliente_id' => $cliente->id,
        ], 201);
    }
}
