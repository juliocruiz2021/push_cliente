<?php

namespace Tests\Feature;

use App\Models\ClienteCompartido;
use App\Models\Empresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ClienteCompartidoSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_crea_y_devuelve_clientes_compartidos(): void
    {
        Empresa::create([
            'nombre' => 'EMPRESA DEMO',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        $response = $this->postJson('/api/v1/clientes-compartidos/sync', [
            'registro_iva' => '12345-6',
            'numero_celular' => '70001111',
            'nombre_usuario' => 'OPERADOR 1',
            'contactos' => [
                [
                    'sync_id' => 'sync-001',
                    'nombre' => 'JUAN PEREZ',
                    'dui' => '12345678-9',
                    'registro_iva' => '99887-1',
                    'giro' => 'COMERCIAL',
                    'direccion' => 'SAN SALVADOR',
                    'celular' => '7000-0000',
                    'email' => 'juan@example.com',
                    'updated_at' => '2026-03-28T04:00:00Z',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonFragment([
                'message' => 'Contactos sincronizados correctamente.',
            ])
            ->assertJsonCount(1, 'contactos');

        $this->assertDatabaseHas('clientes_compartidos', [
            'sync_id' => 'sync-001',
            'nombre' => 'JUAN PEREZ',
            'actualizado_por' => 'OPERADOR 1',
        ]);
    }

    public function test_sync_no_sobrescribe_un_cliente_mas_reciente_en_servidor(): void
    {
        $empresa = Empresa::create([
            'nombre' => 'EMPRESA DEMO',
            'registro_iva' => '12345-6',
            'activo' => true,
        ]);

        $cliente = ClienteCompartido::create([
            'empresa_id' => $empresa->id,
            'sync_id' => 'sync-001',
            'nombre' => 'CLIENTE NUEVO',
            'dui' => '12345678-9',
            'registro_iva' => '99887-1',
            'giro' => 'SERVICIOS',
            'direccion' => 'SANTA ANA',
            'celular' => '7000-0000',
            'email' => 'nuevo@example.com',
            'creado_por' => 'OPERADOR 1',
            'actualizado_por' => 'OPERADOR 1',
        ]);

        $cliente->updated_at = Carbon::parse('2026-03-28T04:10:00Z');
        $cliente->save();

        $response = $this->postJson('/api/v1/clientes-compartidos/sync', [
            'registro_iva' => '12345-6',
            'numero_celular' => '70002222',
            'nombre_usuario' => 'OPERADOR 2',
            'contactos' => [
                [
                    'sync_id' => 'sync-001',
                    'nombre' => 'CLIENTE VIEJO',
                    'dui' => '12345678-9',
                    'registro_iva' => '99887-1',
                    'giro' => 'COMERCIAL',
                    'direccion' => 'SONSONATE',
                    'celular' => '7111-1111',
                    'email' => 'viejo@example.com',
                    'updated_at' => '2026-03-28T04:05:00Z',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('contactos.0.nombre', 'CLIENTE NUEVO');

        $this->assertDatabaseHas('clientes_compartidos', [
            'sync_id' => 'sync-001',
            'nombre' => 'CLIENTE NUEVO',
            'email' => 'nuevo@example.com',
        ]);
    }
}
