<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensaje extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'empresa_id',
        'cliente_empresa_id',
        'numero_destino',
        'titulo',
        'cuerpo',
        'payload_json',
        'estado',
        'proveedor',
        'enviado_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'payload_json' => 'array',
        'enviado_at'   => 'datetime',
    ];

    /**
     * Get the empresa that owns this mensaje.
     */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    /**
     * Get the cliente that this mensaje belongs to.
     */
    public function clienteEmpresa(): BelongsTo
    {
        return $this->belongsTo(ClienteEmpresa::class);
    }
}
