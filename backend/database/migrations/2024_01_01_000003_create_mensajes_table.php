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
        Schema::create('mensajes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('cliente_empresa_id')
                ->nullable()
                ->constrained('clientes_empresa')
                ->nullOnDelete();
            $table->string('numero_destino');
            $table->string('titulo', 200);
            $table->text('cuerpo');
            $table->jsonb('payload_json')->nullable();
            $table->enum('estado', ['pendiente', 'enviado', 'fallido'])->default('pendiente');
            $table->string('proveedor')->default('fcm');
            $table->timestamp('enviado_at')->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'estado', 'enviado_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mensajes');
    }
};
