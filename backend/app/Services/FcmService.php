<?php

namespace App\Services;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use App\Models\Mensaje;
use App\Models\ClienteEmpresa;
use Illuminate\Support\Facades\Log;

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

            $mensaje->update([
                'estado'     => 'enviado',
                'enviado_at' => now(),
            ]);

            return ['success' => true];
        } catch (\Kreait\Firebase\Exception\Messaging\InvalidMessage $e) {
            Log::error('FCM token inválido: ' . $e->getMessage());
            // Invalidar token
            $cliente->update(['fcm_token' => null]);
            $mensaje->update(['estado' => 'fallido']);
            return ['success' => false, 'error' => 'Token inválido, fue eliminado'];
        } catch (\Exception $e) {
            Log::error('FCM error: ' . $e->getMessage());
            $mensaje->update(['estado' => 'fallido']);
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
