<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clientes_empresa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('numero_celular', 20);
            $table->string('nombre_usuario', 150);
            $table->string('device_uuid', 100)->nullable();
            $table->text('fcm_token')->nullable();
            $table->enum('plataforma', ['android', 'ios', 'web'])->default('android');
            $table->string('version_app', 20)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['empresa_id', 'numero_celular']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes_empresa');
    }
};
