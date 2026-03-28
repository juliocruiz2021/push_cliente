import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/axios';

const EMPTY_FORM = {
  registro_iva: '',
  nombre: '',
  nombre_servidor: '',
  activo: true,
};

function getServidores(empresa) {
  const servidores = [
    empresa?.nombre_servidor,
    ...(empresa?.clientes ?? []).map((cliente) => cliente.nombre_servidor),
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return [...new Set(servidores)];
}

function StatusBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Inactivo
    </span>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
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

export default function Empresas() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['empresas', page, search],
    queryFn: () =>
      apiClient
        .get('/empresas', { params: { page, search: search || undefined, per_page: 15 } })
        .then((response) => response.data),
    keepPreviousData: true,
  });

  const showSuccess = (message) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingEmpresa
        ? apiClient.put(`/empresas/${editingEmpresa.id}`, payload)
        : apiClient.post('/empresas', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setModalOpen(false);
      setEditingEmpresa(null);
      setForm(EMPTY_FORM);
      setFormErrors({});
      showSuccess(editingEmpresa ? 'Empresa actualizada correctamente.' : 'Empresa creada correctamente.');
    },
    onError: (error) => {
      const errors = error.response?.data?.errors;
      if (errors) {
        setFormErrors(errors);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/empresas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
      showSuccess('Empresa eliminada correctamente.');
    },
  });

  const openCreate = () => {
    setEditingEmpresa(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (empresa) => {
    setEditingEmpresa(empresa);
    setForm({
      registro_iva: empresa.registro_iva,
      nombre: empresa.nombre,
      nombre_servidor: empresa.nombre_servidor ?? '',
      activo: empresa.activo,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const errors = {};

    if (!form.registro_iva.trim()) {
      errors.registro_iva = ['El registro IVA es obligatorio.'];
    }

    if (!form.nombre.trim()) {
      errors.nombre = ['El nombre es obligatorio.'];
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    saveMutation.mutate(form);
  };

  const empresas = data?.data ?? [];
  const meta = data?.meta ?? data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Empresas</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gestion de empresas registradas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva empresa
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, registro IVA o servidor..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registro IVA</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Servidor(es)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 5 }).map((_, columnIndex) => (
                    <td key={columnIndex} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : empresas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                  No se encontraron empresas.
                </td>
              </tr>
            ) : (
              empresas.map((empresa) => {
                const servidores = getServidores(empresa);

                return (
                  <tr key={empresa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 text-sm">{empresa.nombre}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{empresa.registro_iva}</td>
                    <td className="px-6 py-4">
                      {servidores.map((servidor) => (
                        <span
                          key={servidor}
                          className="inline-block bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full mr-1"
                        >
                          {servidor}
                        </span>
                      ))}
                      {servidores.length === 0 && <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge activo={empresa.activo} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(empresa)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setDeleteTarget(empresa)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {meta?.last_page > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
            <span>
              Pagina {meta.current_page} de {meta.last_page} - {meta.total} registros
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Anterior
              </button>
              <button
                disabled={page === meta.last_page}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmpresa ? 'Editar empresa' : 'Nueva empresa'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingEmpresa && (() => {
            const servidores = getServidores(editingEmpresa);

            return servidores.length > 0 ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Servidor(es) registrados</p>
                <div className="flex flex-wrap gap-1">
                  {servidores.map((servidor) => (
                    <span
                      key={servidor}
                      className="bg-indigo-100 text-indigo-700 text-sm font-medium px-3 py-0.5 rounded-full"
                    >
                      {servidor}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registro IVA</label>
            <input
              name="registro_iva"
              value={form.registro_iva}
              onChange={handleFormChange}
              disabled={Boolean(editingEmpresa)}
              placeholder="Ej: 12345-6"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.registro_iva
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              } disabled:bg-gray-50 disabled:text-gray-500`}
            />
            {formErrors.registro_iva && (
              <p className="mt-1 text-xs text-red-600">{formErrors.registro_iva[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleFormChange}
              placeholder="Nombre de la empresa"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.nombre
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.nombre && (
              <p className="mt-1 text-xs text-red-600">{formErrors.nombre[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servidor</label>
            <input
              name="nombre_servidor"
              value={form.nombre_servidor}
              onChange={handleFormChange}
              placeholder="Ej: SIGA1"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.nombre_servidor
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Se usa como servidor principal o referencia inicial para la empresa.
            </p>
            {formErrors.nombre_servidor && (
              <p className="mt-1 text-xs text-red-600">{formErrors.nombre_servidor[0]}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              checked={form.activo}
              onChange={handleFormChange}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-400"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">Empresa activa</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold transition"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar eliminacion"
      >
        <p className="text-gray-600 text-sm mb-6">
          Estas seguro que desea eliminar la empresa{' '}
          <strong className="text-gray-800">{deleteTarget?.nombre}</strong>? Esta accion no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold transition"
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
