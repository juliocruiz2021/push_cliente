<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClienteEmpresa extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'clientes_empresa';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'empresa_id',
        'numero_celular',
        'nombre_usuario',
        'device_uuid',
        'fcm_token',
        'plataforma',
        'version_app',
        'activo',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Get the empresa that owns this client.
     */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    /**
     * Get all mensajes for this cliente.
     */
    public function mensajes(): HasMany
    {
        return $this->hasMany(Mensaje::class);
    }
}
