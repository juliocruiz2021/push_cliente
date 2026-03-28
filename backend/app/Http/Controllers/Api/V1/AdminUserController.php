<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $users = AdminUser::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%');
                });
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'created_at', 'updated_at']);

        return response()->json([
            'data' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:admin_users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = AdminUser::create($validated);

        return response()->json([
            'message' => 'Usuario creado correctamente.',
            'user' => $user->only(['id', 'name', 'email', 'created_at', 'updated_at']),
        ], 201);
    }

    public function update(Request $request, AdminUser $usuario)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('admin_users', 'email')->ignore($usuario->id),
            ],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $usuario->name = $validated['name'];
        $usuario->email = $validated['email'];

        if (!empty($validated['password'])) {
            $usuario->password = $validated['password'];
        }

        $usuario->save();

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'user' => $usuario->only(['id', 'name', 'email', 'created_at', 'updated_at']),
        ]);
    }

    public function destroy(Request $request, AdminUser $usuario)
    {
        if ((int) $request->user()->id === (int) $usuario->id) {
            return response()->json([
                'message' => 'No puede eliminar su propio usuario.',
            ], 422);
        }

        if (AdminUser::query()->count() <= 1) {
            return response()->json([
                'message' => 'Debe existir al menos un usuario administrador.',
            ], 422);
        }

        $usuario->delete();

        return response()->json([
            'message' => 'Usuario eliminado correctamente.',
        ]);
    }
}
