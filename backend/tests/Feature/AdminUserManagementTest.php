<?php

namespace Tests\Feature;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_puede_listar_y_crear_usuarios(): void
    {
        $admin = AdminUser::create([
            'name' => 'Administrador',
            'email' => 'admin@example.com',
            'password' => 'Clave1234!',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/usuarios')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment([
                'email' => 'admin@example.com',
            ]);

        $response = $this->postJson('/api/v1/usuarios', [
            'name' => 'Operador 2',
            'email' => 'operador2@example.com',
            'password' => 'Clave5678!',
            'password_confirmation' => 'Clave5678!',
        ]);

        $response->assertCreated()
            ->assertJsonFragment([
                'message' => 'Usuario creado correctamente.',
                'email' => 'operador2@example.com',
            ]);

        $this->assertDatabaseHas('admin_users', [
            'email' => 'operador2@example.com',
            'name' => 'Operador 2',
        ]);
    }

    public function test_admin_puede_actualizar_usuario_y_no_puede_eliminarse_a_si_mismo(): void
    {
        $admin = AdminUser::create([
            'name' => 'Administrador',
            'email' => 'admin@example.com',
            'password' => 'Clave1234!',
        ]);

        $otroUsuario = AdminUser::create([
            'name' => 'Operador',
            'email' => 'operador@example.com',
            'password' => 'Clave1234!',
        ]);

        Sanctum::actingAs($admin);

        $updateResponse = $this->putJson("/api/v1/usuarios/{$otroUsuario->id}", [
            'name' => 'Operador Editado',
            'email' => 'operador.editado@example.com',
            'password' => 'NuevaClave123!',
            'password_confirmation' => 'NuevaClave123!',
        ]);

        $updateResponse->assertOk()
            ->assertJsonFragment([
                'message' => 'Usuario actualizado correctamente.',
                'email' => 'operador.editado@example.com',
            ]);

        $otroUsuario->refresh();

        $this->assertSame('Operador Editado', $otroUsuario->name);
        $this->assertSame('operador.editado@example.com', $otroUsuario->email);
        $this->assertTrue(Hash::check('NuevaClave123!', $otroUsuario->password));

        $deleteResponse = $this->deleteJson("/api/v1/usuarios/{$admin->id}");

        $deleteResponse->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'No puede eliminar su propio usuario.',
            ]);
    }
}
