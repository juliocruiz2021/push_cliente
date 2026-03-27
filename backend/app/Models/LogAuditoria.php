<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAuditoria extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'logs_auditoria';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'admin_user_id',
        'accion',
        'descripcion',
        'ip_address',
        'user_agent',
        'datos_antes',
        'datos_despues',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'datos_antes'    => 'array',
        'datos_despues'  => 'array',
    ];

    /**
     * Get the admin user associated with this log.
     */
    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class);
    }

    /**
     * Helper to create a log entry from a request context.
     */
    public static function registrar(
        string $accion,
        ?string $descripcion = null,
        ?array $datosAntes = null,
        ?array $datosDespues = null,
        ?\Illuminate\Http\Request $request = null,
        ?int $adminUserId = null
    ): self {
        return self::create([
            'admin_user_id'  => $adminUserId,
            'accion'         => $accion,
            'descripcion'    => $descripcion,
            'ip_address'     => $request?->ip(),
            'user_agent'     => $request?->userAgent(),
            'datos_antes'    => $datosAntes,
            'datos_despues'  => $datosDespues,
        ]);
    }
}
