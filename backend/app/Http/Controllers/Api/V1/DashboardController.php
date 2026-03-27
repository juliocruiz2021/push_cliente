<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\ClienteEmpresa;
use App\Models\Mensaje;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * Return summary statistics for the dashboard.
     */
    public function index(): JsonResponse
    {
        $stats = Cache::remember('dashboard_stats', 60, function () {
            $totalEmpresasActivas = Empresa::where('activo', true)->count();

            $totalClientesActivos = ClienteEmpresa::where('activo', true)->count();

            $totalMensajesHoy = Mensaje::where('estado', 'enviado')
                ->whereDate('enviado_at', today())
                ->count();

            $totalMensajesFallidos = Mensaje::where('estado', 'fallido')
                ->count();

            return [
                'empresas_activas'  => $totalEmpresasActivas,
                'clientes_activos'  => $totalClientesActivos,
                'mensajes_hoy'      => $totalMensajesHoy,
                'mensajes_fallidos' => $totalMensajesFallidos,
            ];
        });

        return response()->json($stats);
    }
}
