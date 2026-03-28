<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\LogAuditoria;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EmpresaController extends Controller
{
    /**
     * Display a listing of empresas.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Empresa::query();

        if ($request->has('activo')) {
            $query->where('activo', filter_var($request->activo, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('nombre', 'ilike', '%' . $request->search . '%')
                  ->orWhere('registro_iva', 'ilike', '%' . $request->search . '%');
            });
        }

        $empresas = $query->with('clientes:id,empresa_id,nombre_servidor')
            ->orderBy('nombre')
            ->paginate($request->per_page ?? 20);

        return response()->json($empresas);
    }

    /**
     * Store a newly created empresa.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'registro_iva' => 'required|string|max:50|unique:empresas,registro_iva',
            'nombre'       => 'required|string|max:255',
            'activo'       => 'nullable|boolean',
        ]);

        $empresa = Empresa::create([
            'registro_iva' => $validated['registro_iva'],
            'nombre'       => $validated['nombre'],
            'activo'       => $validated['activo'] ?? true,
        ]);

        LogAuditoria::registrar(
            accion: 'empresa.creada',
            descripcion: "Empresa creada: {$empresa->nombre} ({$empresa->registro_iva})",
            datosDespues: $empresa->toArray(),
            request: $request,
            adminUserId: $request->user()?->id
        );

        return response()->json([
            'message' => 'Empresa creada correctamente.',
            'empresa' => $empresa,
        ], 201);
    }

    /**
     * Display the specified empresa.
     */
    public function show(Empresa $empresa): JsonResponse
    {
        $empresa->loadCount(['clientes', 'mensajes']);

        return response()->json($empresa);
    }

    /**
     * Update the specified empresa.
     */
    public function update(Request $request, Empresa $empresa): JsonResponse
    {
        $validated = $request->validate([
            'registro_iva' => 'sometimes|required|string|max:50|unique:empresas,registro_iva,' . $empresa->id,
            'nombre'       => 'sometimes|required|string|max:255',
            'activo'       => 'nullable|boolean',
        ]);

        $datosAntes = $empresa->toArray();
        $empresa->update($validated);

        LogAuditoria::registrar(
            accion: 'empresa.actualizada',
            descripcion: "Empresa actualizada: {$empresa->nombre} ({$empresa->registro_iva})",
            datosAntes: $datosAntes,
            datosDespues: $empresa->fresh()->toArray(),
            request: $request,
            adminUserId: $request->user()?->id
        );

        return response()->json([
            'message' => 'Empresa actualizada correctamente.',
            'empresa' => $empresa->fresh(),
        ]);
    }

    /**
     * Remove the specified empresa.
     */
    public function destroy(Request $request, Empresa $empresa): JsonResponse
    {
        $datosAntes = $empresa->toArray();

        $empresa->delete();

        LogAuditoria::registrar(
            accion: 'empresa.eliminada',
            descripcion: "Empresa eliminada: {$datosAntes['nombre']} ({$datosAntes['registro_iva']})",
            datosAntes: $datosAntes,
            request: $request,
            adminUserId: $request->user()?->id
        );

        return response()->json([
            'message' => 'Empresa eliminada correctamente.',
        ]);
    }
}
