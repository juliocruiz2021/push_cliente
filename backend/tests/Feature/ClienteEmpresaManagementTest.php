<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\ClienteEmpresa;
use App\Models\Empresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClienteEmpresaManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_puede_crear_actualizar_y_eliminar_dispositivo_manual(): void
    {
        $admin = AdminUser::create([
            'name' => 'Administrador',
            'email' => 'admin@example.com',
            'password' => 'Clave1234!',
        ]);

        $empresa = Empresa::create([
            'nombre' => 'EMPRESA DEMO',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        Sanctum::actingAs($admin);

        $createResponse = $this->postJson('/api/v1/clientes', [
            'empresa_id' => $empresa->id,
            'numero_celular' => '70001111',
            'nombre_usuario' => 'OPERADOR 1',
            'nombre_servidor' => 'SIGA1',
            'device_uuid' => 'uuid-demo',
            'fcm_token' => 'token-demo',
            'plataforma' => 'android',
            'version_app' => '1.1.0',
            'activo' => true,
        ]);

        $createResponse->assertCreated()
            ->assertJsonFragment([
                'message' => 'Dispositivo creado correctamente.',
                'numero_celular' => '70001111',
                'nombre_servidor' => 'SIGA1',
            ]);

        $cliente = ClienteEmpresa::where('numero_celular', '70001111')->firstOrFail();

        $updateResponse = $this->putJson("/api/v1/clientes/{$cliente->id}", [
            'nombre_usuario' => 'OPERADOR EDITADO',
            'nombre_servidor' => 'SIGA2',
            'activo' => false,
        ]);

        $updateResponse->assertOk()
            ->assertJsonFragment([
                'message' => 'Dispositivo actualizado correctamente.',
                'nombre_usuario' => 'OPERADOR EDITADO',
                'nombre_servidor' => 'SIGA2',
            ]);

        $this->assertDatabaseHas('clientes_empresa', [
            'id' => $cliente->id,
            'nombre_usuario' => 'OPERADOR EDITADO',
            'nombre_servidor' => 'SIGA2',
            'activo' => 0,
        ]);

        $deleteResponse = $this->deleteJson("/api/v1/clientes/{$cliente->id}");

        $deleteResponse->assertOk()
            ->assertJsonFragment([
                'message' => 'Dispositivo eliminado correctamente.',
            ]);

        $this->assertDatabaseMissing('clientes_empresa', [
            'id' => $cliente->id,
        ]);
    }
}
