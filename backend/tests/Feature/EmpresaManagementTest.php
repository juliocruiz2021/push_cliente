<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use App\Models\Empresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmpresaManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_puede_crear_y_actualizar_empresa_con_nombre_servidor(): void
    {
        $admin = AdminUser::create([
            'name' => 'Administrador',
            'email' => 'admin@example.com',
            'password' => 'Clave1234!',
        ]);

        Sanctum::actingAs($admin);

        $createResponse = $this->postJson('/api/v1/empresas', [
            'registro_iva' => '12345-6',
            'nombre' => 'Empresa Demo',
            'nombre_servidor' => 'SIGA1',
            'activo' => true,
        ]);

        $createResponse->assertCreated()
            ->assertJsonFragment([
                'message' => 'Empresa creada correctamente.',
                'nombre' => 'Empresa Demo',
                'nombre_servidor' => 'SIGA1',
            ]);

        $empresa = Empresa::where('registro_iva', '12345-6')->firstOrFail();

        $this->assertSame('SIGA1', $empresa->nombre_servidor);

        $updateResponse = $this->putJson("/api/v1/empresas/{$empresa->id}", [
            'nombre' => 'Empresa Demo Editada',
            'nombre_servidor' => 'SIGA2',
        ]);

        $updateResponse->assertOk()
            ->assertJsonFragment([
                'message' => 'Empresa actualizada correctamente.',
                'nombre' => 'Empresa Demo Editada',
                'nombre_servidor' => 'SIGA2',
            ]);

        $this->assertDatabaseHas('empresas', [
            'id' => $empresa->id,
            'nombre' => 'Empresa Demo Editada',
            'nombre_servidor' => 'SIGA2',
        ]);
    }

    public function test_admin_puede_buscar_empresa_por_nombre_servidor(): void
    {
        $admin = AdminUser::create([
            'name' => 'Administrador',
            'email' => 'admin@example.com',
            'password' => 'Clave1234!',
        ]);

        Empresa::create([
            'registro_iva' => '12345-6',
            'nombre' => 'Empresa Demo',
            'nombre_servidor' => 'SIGA-SV',
            'activo' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/empresas?search=SIGA-SV')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'nombre' => 'Empresa Demo',
                'nombre_servidor' => 'SIGA-SV',
            ]);
    }
}
