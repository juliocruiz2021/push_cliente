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
        Schema::create('clientes_compartidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('sync_id', 80);
            $table->string('nombre', 255);
            $table->string('dui', 30)->nullable();
            $table->string('registro_iva', 50)->nullable();
            $table->string('giro', 255)->nullable();
            $table->text('direccion')->nullable();
            $table->string('celular', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('creado_por', 150)->nullable();
            $table->string('actualizado_por', 150)->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'sync_id']);
            $table->index(['empresa_id', 'updated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes_compartidos');
    }
};
