<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes_empresa', function (Blueprint $table) {
            $table->string('nombre_servidor', 150)->nullable()->after('nombre_usuario');
        });
    }

    public function down(): void
    {
        Schema::table('clientes_empresa', function (Blueprint $table) {
            $table->dropColumn('nombre_servidor');
        });
    }
};
