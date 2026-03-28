<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClienteCompartido extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'clientes_compartidos';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'empresa_id',
        'sync_id',
        'nombre',
        'dui',
        'registro_iva',
        'giro',
        'direccion',
        'celular',
        'email',
        'creado_por',
        'actualizado_por',
    ];

    /**
     * Get the empresa that owns this shared client.
     */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
