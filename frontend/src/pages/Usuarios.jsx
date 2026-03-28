import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
};

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [serverError, setServerError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios', search],
    queryFn: () =>
      apiClient
        .get('/usuarios', { params: { search: search || undefined } })
        .then((response) => response.data),
  });

  const usuarios = data?.data ?? [];

  const usuariosFiltrados = useMemo(() => {
    if (!search.trim()) return usuarios;
    const term = search.trim().toLowerCase();
    return usuarios.filter(
      (item) =>
        item.name?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term)
    );
  }, [search, usuarios]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setServerError('');
  };

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (usuario) => {
    setEditingUser(usuario);
    setForm({
      name: usuario.name ?? '',
      email: usuario.email ?? '',
      password: '',
      password_confirmation: '',
    });
    setFormErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingUser
        ? apiClient.put(`/usuarios/${editingUser.id}`, payload)
        : apiClient.post('/usuarios', payload),
    onSuccess: (response) => {
      const savedUser = response.data.user;

      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setModalOpen(false);
      resetForm();
      showSuccess(editingUser ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');

      if (savedUser?.id === user?.id) {
        updateUser(savedUser);
      }
    },
    onError: (error) => {
      const errors = error.response?.data?.errors;
      const message = error.response?.data?.message;

      if (errors) {
        setFormErrors(errors);
      } else if (message) {
        setServerError(message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/usuarios/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setDeleteTarget(null);
      showSuccess('Usuario eliminado correctamente.');

      if (deletedId === user?.id) {
        updateUser(null);
      }
    },
    onError: (error) => {
      setServerError(error.response?.data?.message || 'No se pudo eliminar el usuario.');
      setDeleteTarget(null);
    },
  });

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }

    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
    };

    if (form.password) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }

    if (!editingUser) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }

    saveMutation.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Usuarios</h2>
          <p className="text-gray-500 text-sm mt-0.5">Administraci&oacute;n de accesos al panel</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {serverError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {serverError}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Correo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, row) => (
                <tr key={row}>
                  {Array.from({ length: 4 }).map((_, cell) => (
                    <td key={cell} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((item) => {
                const esUsuarioActual = item.id === user?.id;

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                        {esUsuarioActual && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            Tu cuenta
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                        >
                          Editar
                        </button>
                        {!esUsuarioActual && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="Nombre completo"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.name
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleFormChange}
              placeholder="correo@empresa.com"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.email
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email[0]}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingUser ? 'Nueva clave (opcional)' : 'Clave'}
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleFormChange}
                placeholder={editingUser ? 'Solo si la cambiar&aacute;' : 'M&iacute;nimo 8 caracteres'}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                  formErrors.password
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-indigo-400'
                }`}
              />
              {formErrors.password && <p className="mt-1 text-xs text-red-600">{formErrors.password[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar clave</label>
              <input
                name="password_confirmation"
                type="password"
                value={form.password_confirmation}
                onChange={handleFormChange}
                placeholder="Repita la clave"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
            {editingUser
              ? 'Si deja la clave vac&iacute;a, se conservar&aacute; la actual.'
              : 'La clave debe tener al menos 8 caracteres.'}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition"
            >
              {saveMutation.isPending ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar usuario"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Desea eliminar el acceso de <strong>{deleteTarget?.name}</strong>?
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
