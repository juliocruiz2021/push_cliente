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
        $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
        $this->messaging = $factory->createMessaging();
    }

    public function enviarNotificacion(Mensaje $mensaje, ClienteEmpresa $cliente): array
    {
        try {
            if (empty($cliente->fcm_token)) {
                return ['success' => false, 'error' => 'Token FCM no disponible'];
            }

            $notification = Notification::create($mensaje->titulo, $mensaje->cuerpo);
            $data = $mensaje->payload_json ?? [];

            $message = CloudMessage::withTarget('token', $cliente->fcm_token)
                ->withNotification($notification)
                ->withData(array_map('strval', $data));

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
}
