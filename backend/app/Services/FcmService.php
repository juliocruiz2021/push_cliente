<?php

namespace App\Services;

use App\Models\ClienteEmpresa;
use App\Models\Mensaje;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class FcmService
{
    protected $messaging;

    public function __construct()
    {
        $credentialsPath = $this->resolveCredentialsPath();
        $factory = (new Factory)->withServiceAccount($credentialsPath);
        $this->messaging = $factory->createMessaging();
    }

    private function resolveCredentialsPath(): string
    {
        $configuredPath = env('FIREBASE_CREDENTIALS', 'storage/app/firebase-credentials.json');

        if ($configuredPath === '') {
            return storage_path('app/firebase-credentials.json');
        }

        $isAbsolutePath = str_starts_with($configuredPath, '/')
            || preg_match('/^[A-Za-z]:\\\\/', $configuredPath) === 1;

        return $isAbsolutePath
            ? $configuredPath
            : base_path($configuredPath);
    }

    public function enviarNotificacion(Mensaje $mensaje, ClienteEmpresa $cliente): array
    {
        $resultado = $this->enviarNotificacionInterna($mensaje, $cliente);

        if ($resultado['success']) {
            $mensaje->update([
                'estado' => 'enviado',
                'enviado_at' => now(),
            ]);
        } else {
            $mensaje->update(['estado' => 'fallido']);
        }

        return $resultado;
    }

    public function enviarNotificacionAMultiples(Mensaje $mensaje, iterable $clientes): array
    {
        $destinos = [];

        foreach ($clientes as $cliente) {
            if (empty($cliente->fcm_token)) {
                continue;
            }

            $destinos[$cliente->fcm_token] ??= $cliente;
        }

        if ($destinos === []) {
            $mensaje->update(['estado' => 'fallido']);

            return [
                'success' => false,
                'sent' => 0,
                'failed' => 0,
                'error' => 'No hay tokens FCM activos para el numero destino.',
            ];
        }

        $sent = 0;
        $failed = 0;
        $errors = [];

        foreach ($destinos as $cliente) {
            $resultado = $this->enviarNotificacionInterna($mensaje, $cliente);

            if ($resultado['success']) {
                $sent++;
                continue;
            }

            $failed++;
            if (!empty($resultado['error'])) {
                $errors[] = $resultado['error'];
            }
        }

        if ($sent > 0) {
            $mensaje->update([
                'estado' => 'enviado',
                'enviado_at' => now(),
            ]);
        } else {
            $mensaje->update(['estado' => 'fallido']);
        }

        return [
            'success' => $sent > 0,
            'sent' => $sent,
            'failed' => $failed,
            'error' => $sent > 0 ? null : implode('; ', array_unique($errors)),
        ];
    }

    private function enviarNotificacionInterna(Mensaje $mensaje, ClienteEmpresa $cliente): array
    {
        try {
            if (empty($cliente->fcm_token)) {
                return ['success' => false, 'error' => 'Token FCM no disponible'];
            }

            $notification = Notification::create($mensaje->titulo, $mensaje->cuerpo);
            $data = $this->buildDataPayload($mensaje, $cliente);

            $message = CloudMessage::withTarget('token', $cliente->fcm_token)
                ->withNotification($notification)
                ->withData($data);

            $this->messaging->send($message);

            return ['success' => true];
        } catch (\Kreait\Firebase\Exception\Messaging\InvalidMessage $e) {
            Log::error('FCM token invalido: ' . $e->getMessage());
            $cliente->update(['fcm_token' => null]);

            return ['success' => false, 'error' => 'Token invalido, fue eliminado'];
        } catch (\Throwable $e) {
            Log::error('FCM error: ' . $e->getMessage());

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function buildDataPayload(Mensaje $mensaje, ClienteEmpresa $cliente): array
    {
        $mensaje->loadMissing('empresa:id,nombre');

        $normalized = [];
        foreach (($mensaje->payload_json ?? []) as $key => $value) {
            if (!is_scalar($value) && $value !== null) {
                $normalized[$key] = json_encode($value, JSON_UNESCAPED_UNICODE);
                continue;
            }

            $normalized[$key] = (string) ($value ?? '');
        }

        $normalized['mensaje_id'] = (string) $mensaje->id;
        $normalized['empresa'] = (string) ($mensaje->empresa?->nombre ?? '');
        $normalized['servidor'] = (string) ($cliente->nombre_servidor ?? '');
        $normalized['numero_destino'] = (string) $mensaje->numero_destino;

        return $normalized;
    }
}
