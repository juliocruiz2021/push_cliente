<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClienteController;
use App\Http\Controllers\Api\V1\MensajeController;
use App\Http\Controllers\Api\V1\EmpresaController;
use App\Http\Controllers\Api\V1\DashboardController;

Route::prefix('v1')->group(function () {

    // Auth pública
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1');

    // Endpoints públicos para la app móvil
    Route::post('clientes/registrar-dispositivo', [ClienteController::class, 'registrarDispositivo'])
        ->middleware('throttle:30,1');

    // Protegidos con Sanctum
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('dashboard', [DashboardController::class, 'index']);

        Route::apiResource('empresas', EmpresaController::class);

        Route::get('clientes', [ClienteController::class, 'index']);

        Route::post('mensajes/enviar', [MensajeController::class, 'enviar']);
        Route::get('mensajes/historial', [MensajeController::class, 'historial']);
    });
});
