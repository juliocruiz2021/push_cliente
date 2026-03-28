<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Empresa extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'registro_iva',
        'nombre',
        'nombre_servidor',
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
     * Get all clientes for this empresa.
     */
    public function clientes(): HasMany
    {
        return $this->hasMany(ClienteEmpresa::class);
    }

    /**
     * Get all mensajes for this empresa.
     */
    public function mensajes(): HasMany
    {
        return $this->hasMany(Mensaje::class);
    }

    /**
     * Get all shared clients for this empresa.
     */
    public function clientesCompartidos(): HasMany
    {
        return $this->hasMany(ClienteCompartido::class);
    }
}
