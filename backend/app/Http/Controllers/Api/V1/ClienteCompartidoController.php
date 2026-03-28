<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClienteCompartido;
use App\Models\Empresa;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClienteCompartidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'empresa_id' => 'nullable|integer|exists:empresas,id',
            'search'     => 'nullable|string|max:100',
            'per_page'   => 'nullable|integer|min:1|max:100',
        ]);

        $query = ClienteCompartido::with('empresa:id,nombre,registro_iva')
            ->orderBy('nombre')
            ->orderByDesc('updated_at');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->filled('search')) {
            $search = '%' . mb_strtolower($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(nombre) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(dui) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(registro_iva) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(celular) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$search]);
            });
        }

        return response()->json($query->paginate($request->per_page ?? 20));
    }

    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registro_iva'   => 'required|string|max:50',
            'numero_celular' => 'nullable|string|max:20',
            'nombre_usuario' => 'nullable|string|max:150',
            'contactos'      => 'nullable|array|max:1000',
            'contactos.*.sync_id' => 'required|string|max:80',
            'contactos.*.nombre' => 'required|string|max:255',
            'contactos.*.dui' => 'nullable|string|max:30',
            'contactos.*.registro_iva' => 'nullable|string|max:50',
            'contactos.*.giro' => 'nullable|string|max:255',
            'contactos.*.direccion' => 'nullable|string|max:1000',
            'contactos.*.celular' => 'nullable|string|max:30',
            'contactos.*.email' => 'nullable|string|max:255',
            'contactos.*.updated_at' => 'nullable|date',
        ]);

        $empresa = Empresa::where('registro_iva', $validated['registro_iva'])
            ->where('activo', true)
            ->firstOrFail();

        $actor = trim(
            $validated['nombre_usuario']
            ?? $validated['numero_celular']
            ?? ''
        );

        foreach (($validated['contactos'] ?? []) as $contactoData) {
            $incomingUpdatedAt = isset($contactoData['updated_at'])
                ? Carbon::parse($contactoData['updated_at'])
                : now();

            $cliente = ClienteCompartido::firstOrNew([
                'empresa_id' => $empresa->id,
                'sync_id' => $contactoData['sync_id'],
            ]);

            $shouldUpdate = !$cliente->exists
                || !$cliente->updated_at
                || $incomingUpdatedAt->greaterThanOrEqualTo($cliente->updated_at);

            if (!$shouldUpdate) {
                continue;
            }

            $cliente->fill([
                'nombre' => $contactoData['nombre'],
                'dui' => $contactoData['dui'] ?? null,
                'registro_iva' => $contactoData['registro_iva'] ?? null,
                'giro' => $contactoData['giro'] ?? null,
                'direccion' => $contactoData['direccion'] ?? null,
                'celular' => $contactoData['celular'] ?? null,
                'email' => $contactoData['email'] ?? null,
                'actualizado_por' => $actor !== '' ? $actor : $cliente->actualizado_por,
            ]);

            if (!$cliente->exists && $actor !== '') {
                $cliente->creado_por = $actor;
            }

            $cliente->save();
        }

        $contactos = ClienteCompartido::with('empresa:id,nombre,registro_iva')
            ->where('empresa_id', $empresa->id)
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'message' => 'Contactos sincronizados correctamente.',
            'contactos' => $contactos,
            'server_time' => now()->toIso8601String(),
        ]);
    }
}
