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
        Schema::table('mensajes', function (Blueprint $table) {
            $table->timestamp('recepcion_confirmada_at')
                ->nullable()
                ->after('enviado_at');
            $table->string('recepcion_confirmada_por', 20)
                ->nullable()
                ->after('recepcion_confirmada_at');
            $table->string('recepcion_device_uuid', 100)
                ->nullable()
                ->after('recepcion_confirmada_por');

            $table->index('recepcion_confirmada_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mensajes', function (Blueprint $table) {
            $table->dropIndex(['recepcion_confirmada_at']);
            $table->dropColumn([
                'recepcion_confirmada_at',
                'recepcion_confirmada_por',
                'recepcion_device_uuid',
            ]);
        });
    }
};
