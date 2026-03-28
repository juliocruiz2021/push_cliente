<?php

namespace Tests\Feature;

use App\Models\ClienteEmpresa;
use App\Models\Empresa;
use App\Models\Mensaje;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfirmarRecepcionTest extends TestCase
{
    use RefreshDatabase;

    public function test_destinatario_puede_confirmar_recepcion(): void
    {
        $empresa = Empresa::create([
            'nombre' => 'EMPRESA DE PRUEBA',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        $cliente = ClienteEmpresa::create([
            'empresa_id' => $empresa->id,
            'numero_celular' => '70001111',
            'nombre_usuario' => 'OPERADOR',
            'nombre_servidor' => 'SIGA1',
            'device_uuid' => 'uuid-demo',
            'fcm_token' => 'token-demo',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        $mensaje = Mensaje::create([
            'empresa_id' => $empresa->id,
            'cliente_empresa_id' => $cliente->id,
            'numero_destino' => '70001111',
            'titulo' => 'PRUEBA',
            'cuerpo' => '{"empresa":"EMPRESA DE PRUEBA","servidor":"SIGA1","data":{"nombre":"JUAN"}}',
            'estado' => 'enviado',
            'proveedor' => 'fcm',
            'enviado_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/clientes/confirmar-recepcion', [
            'mensaje_id' => $mensaje->id,
            'registro_iva' => '12345-6',
            'numero_celular' => '70001111',
            'device_uuid' => 'uuid-demo',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'message' => 'Recepcion confirmada correctamente.',
                'mensaje_id' => $mensaje->id,
            ]);

        $this->assertDatabaseHas('mensajes', [
            'id' => $mensaje->id,
            'recepcion_confirmada_por' => '70001111',
            'recepcion_device_uuid' => 'uuid-demo',
        ]);
    }

    public function test_no_permite_confirmar_si_el_numero_no_corresponde_al_destino(): void
    {
        $empresa = Empresa::create([
            'nombre' => 'EMPRESA DE PRUEBA',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        $cliente = ClienteEmpresa::create([
            'empresa_id' => $empresa->id,
            'numero_celular' => '70001111',
            'nombre_usuario' => 'OPERADOR',
            'nombre_servidor' => 'SIGA1',
            'device_uuid' => 'uuid-demo',
            'fcm_token' => 'token-demo',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        $mensaje = Mensaje::create([
            'empresa_id' => $empresa->id,
            'cliente_empresa_id' => $cliente->id,
            'numero_destino' => '70001111',
            'titulo' => 'PRUEBA',
            'cuerpo' => '{"empresa":"EMPRESA DE PRUEBA","servidor":"SIGA1","data":{"nombre":"JUAN"}}',
            'estado' => 'enviado',
            'proveedor' => 'fcm',
            'enviado_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/clientes/confirmar-recepcion', [
            'mensaje_id' => $mensaje->id,
            'registro_iva' => '12345-6',
            'numero_celular' => '79999999',
            'device_uuid' => 'uuid-ajeno',
        ]);

        $response->assertForbidden()
            ->assertJsonFragment([
                'message' => 'Este dispositivo no corresponde al destinatario del mensaje.',
            ]);

        $this->assertDatabaseMissing('mensajes', [
            'id' => $mensaje->id,
            'recepcion_confirmada_por' => '79999999',
        ]);
    }
}
