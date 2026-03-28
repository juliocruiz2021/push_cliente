<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\ClienteEmpresa;
use App\Models\Empresa;
use App\Models\Mensaje;
use App\Services\FcmService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class NumeroGlobalNotificationRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_app_envia_a_todos_los_dispositivos_activos_con_el_mismo_numero(): void
    {
        $empresaA = Empresa::create([
            'nombre' => 'EMPRESA A',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        $empresaB = Empresa::create([
            'nombre' => 'EMPRESA B',
            'registro_iva' => '65432-1',
            'activo' => true,
        ]);

        $clienteA = ClienteEmpresa::create([
            'empresa_id' => $empresaA->id,
            'numero_celular' => '70001111',
            'nombre_usuario' => 'OPERADOR A',
            'nombre_servidor' => 'SIGA-A',
            'device_uuid' => 'uuid-a',
            'fcm_token' => 'token-a',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        $clienteB = ClienteEmpresa::create([
            'empresa_id' => $empresaB->id,
            'numero_celular' => '70001111',
            'nombre_usuario' => 'OPERADOR B',
            'nombre_servidor' => 'SIGA-B',
            'device_uuid' => 'uuid-b',
            'fcm_token' => 'token-b',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        $mock = Mockery::mock(FcmService::class);
        $mock->shouldReceive('enviarNotificacionAMultiples')
            ->once()
            ->withArgs(function (Mensaje $mensaje, $clientes) use ($empresaA, $empresaB) {
                return $mensaje->empresa_id === $empresaA->id
                    && $clientes->count() === 2
                    && $clientes->pluck('empresa_id')->sort()->values()->all() === [$empresaA->id, $empresaB->id];
            })
            ->andReturn([
                'success' => true,
                'sent' => 2,
                'failed' => 0,
            ]);

        $this->app->instance(FcmService::class, $mock);

        $response = $this->postJson('/api/v1/clientes/enviar-datos', [
            'registro_iva' => '12345-6',
            'numero_destino' => '70001111',
            'titulo' => 'PRUEBA',
            'cuerpo' => '{"empresa":"EMPRESA A"}',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'estado' => 'pendiente',
                'dispositivos_notificados' => 2,
            ]);

        $this->assertDatabaseHas('mensajes', [
            'empresa_id' => $empresaA->id,
            'cliente_empresa_id' => $clienteA->id,
            'numero_destino' => '70001111',
        ]);

        $this->assertDatabaseMissing('mensajes', [
            'cliente_empresa_id' => $clienteB->id,
            'empresa_id' => $empresaA->id,
            'numero_destino' => '70001111',
        ]);
    }

    public function test_panel_web_tambien_envia_por_numero_sin_filtrar_por_empresa(): void
    {
        $admin = AdminUser::create([
            'name' => 'Administrador',
            'email' => 'admin@example.com',
            'password' => 'Clave1234!',
        ]);

        $empresaA = Empresa::create([
            'nombre' => 'EMPRESA A',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        $empresaB = Empresa::create([
            'nombre' => 'EMPRESA B',
            'registro_iva' => '65432-1',
            'activo' => true,
        ]);

        $clienteA = ClienteEmpresa::create([
            'empresa_id' => $empresaA->id,
            'numero_celular' => '70002222',
            'nombre_usuario' => 'OPERADOR A',
            'nombre_servidor' => 'SIGA-A',
            'device_uuid' => 'uuid-a',
            'fcm_token' => 'token-a',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        ClienteEmpresa::create([
            'empresa_id' => $empresaB->id,
            'numero_celular' => '70002222',
            'nombre_usuario' => 'OPERADOR B',
            'nombre_servidor' => 'SIGA-B',
            'device_uuid' => 'uuid-b',
            'fcm_token' => 'token-b',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        $mock = Mockery::mock(FcmService::class);
        $mock->shouldReceive('enviarNotificacionAMultiples')
            ->once()
            ->withArgs(function (Mensaje $mensaje, $clientes) use ($empresaA) {
                return $mensaje->empresa_id === $empresaA->id
                    && $clientes->count() === 2;
            })
            ->andReturn([
                'success' => true,
                'sent' => 2,
                'failed' => 0,
            ]);

        $this->app->instance(FcmService::class, $mock);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/mensajes/enviar', [
            'registro_iva' => '12345-6',
            'numero_destino' => '70002222',
            'titulo' => 'PRUEBA WEB',
            'cuerpo' => '{"empresa":"EMPRESA A"}',
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'dispositivos_notificados' => 2,
            ]);

        $this->assertDatabaseHas('mensajes', [
            'empresa_id' => $empresaA->id,
            'cliente_empresa_id' => $clienteA->id,
            'numero_destino' => '70002222',
        ]);
    }
}
