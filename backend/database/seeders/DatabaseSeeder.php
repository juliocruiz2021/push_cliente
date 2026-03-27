<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use App\Models\Empresa;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create default admin user
        AdminUser::firstOrCreate(
            ['email' => 'admin@pushcliente.com'],
            [
                'name'     => 'Administrador',
                'password' => Hash::make('Admin1234!'),
            ]
        );

        // Create demo empresa
        Empresa::firstOrCreate(
            ['registro_iva' => '12345-6'],
            [
                'nombre' => 'EMPRESA DE PRUEBA',
                'activo' => true,
            ]
        );
    }
}
