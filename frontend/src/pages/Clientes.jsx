import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '../lib/axios';

const EMPTY_DEVICE_FORM = {
  empresa_id: '',
  numero_celular: '',
  nombre_usuario: '',
  nombre_servidor: '',
  device_uuid: '',
  fcm_token: '',
  plataforma: 'android',
  version_app: '',
  activo: true,
};

function PlatformBadge({ plataforma }) {
  const styles = {
    android: 'bg-green-100 text-green-700',
    ios: 'bg-blue-100 text-blue-700',
    web: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[plataforma] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {plataforma ?? '-'}
    </span>
  );
}

function StatusBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactivo
    </span>
  );
}

function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth}`}>
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

function formatDate(dateStr) {
  if (!dateStr) return '-';

  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatToken(token) {
  if (!token) return 'Sin token';
  if (token.length <= 14) return token;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

function Pagination({ meta, page, setPage }) {
  if (!meta?.last_page || meta.last_page <= 1) return null;

  return (
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
  );
}

export default function Clientes() {
  const queryClient = useQueryClient();
  const [empresaId, setEmpresaId] = useState('');
  const [search, setSearch] = useState('');
  const [pageDispositivos, setPageDispositivos] = useState(1);
  const [pageCompartidos, setPageCompartidos] = useState(1);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState(EMPTY_DEVICE_FORM);
  const [deviceFormErrors, setDeviceFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const { data: empresasData } = useQuery({
    queryKey: ['empresas-all'],
    queryFn: () => apiClient.get('/empresas', { params: { per_page: 100 } }).then((response) => response.data),
    staleTime: 300_000,
  });

  const { data: dispositivosData, isLoading: isLoadingDispositivos } = useQuery({
    queryKey: ['clientes', empresaId, pageDispositivos, search],
    queryFn: () =>
      apiClient.get('/clientes', {
        params: {
          empresa_id: empresaId || undefined,
          page: pageDispositivos,
          search: search || undefined,
          per_page: 15,
        },
      }).then((response) => response.data),
    keepPreviousData: true,
  });

  const { data: compartidosData, isLoading: isLoadingCompartidos } = useQuery({
    queryKey: ['clientes-compartidos', empresaId, pageCompartidos, search],
    queryFn: () =>
      apiClient.get('/clientes-compartidos', {
        params: {
          empresa_id: empresaId || undefined,
          page: pageCompartidos,
          search: search || undefined,
          per_page: 15,
        },
      }).then((response) => response.data),
    keepPreviousData: true,
  });

  const empresas = empresasData?.data ?? [];
  const dispositivos = dispositivosData?.data ?? [];
  const metaDispositivos = dispositivosData?.meta ?? dispositivosData;
  const compartidos = compartidosData?.data ?? [];
  const metaCompartidos = compartidosData?.meta ?? compartidosData;

  const showSuccess = (message) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const refreshDevices = () => {
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['empresas'] });
    queryClient.invalidateQueries({ queryKey: ['empresas-all'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveDeviceMutation = useMutation({
    mutationFn: (payload) =>
      editingDevice
        ? apiClient.put(`/clientes/${editingDevice.id}`, payload)
        : apiClient.post('/clientes', payload),
    onSuccess: () => {
      refreshDevices();
      setDeviceModalOpen(false);
      setEditingDevice(null);
      setDeviceForm(EMPTY_DEVICE_FORM);
      setDeviceFormErrors({});
      showSuccess(editingDevice ? 'Dispositivo actualizado correctamente.' : 'Dispositivo creado correctamente.');
    },
    onError: (error) => {
      const errors = error.response?.data?.errors;
      if (errors) {
        setDeviceFormErrors(errors);
      }
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/clientes/${id}`),
    onSuccess: () => {
      refreshDevices();
      setDeleteTarget(null);
      showSuccess('Dispositivo eliminado correctamente.');
    },
  });

  const resetPages = () => {
    setPageDispositivos(1);
    setPageCompartidos(1);
  };

  const openCreateDevice = () => {
    setEditingDevice(null);
    setDeviceForm({
      ...EMPTY_DEVICE_FORM,
      empresa_id: empresaId || '',
    });
    setDeviceFormErrors({});
    setDeviceModalOpen(true);
  };

  const openEditDevice = (device) => {
    setEditingDevice(device);
    setDeviceForm({
      empresa_id: String(device.empresa_id ?? ''),
      numero_celular: device.numero_celular ?? '',
      nombre_usuario: device.nombre_usuario ?? '',
      nombre_servidor: device.nombre_servidor ?? '',
      device_uuid: device.device_uuid ?? '',
      fcm_token: device.fcm_token ?? '',
      plataforma: device.plataforma ?? 'android',
      version_app: device.version_app ?? '',
      activo: Boolean(device.activo),
    });
    setDeviceFormErrors({});
    setDeviceModalOpen(true);
  };

  const handleDeviceFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDeviceForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

    if (deviceFormErrors[name]) {
      setDeviceFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleDeviceSubmit = (event) => {
    event.preventDefault();

    const errors = {};

    if (!deviceForm.empresa_id) {
      errors.empresa_id = ['Seleccione una empresa.'];
    }

    if (!deviceForm.numero_celular.trim()) {
      errors.numero_celular = ['El numero celular es obligatorio.'];
    }

    if (!deviceForm.nombre_usuario.trim()) {
      errors.nombre_usuario = ['El nombre de usuario es obligatorio.'];
    }

    if (Object.keys(errors).length > 0) {
      setDeviceFormErrors(errors);
      return;
    }

    saveDeviceMutation.mutate({
      ...deviceForm,
      empresa_id: Number(deviceForm.empresa_id),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Dispositivos registrados y clientes compartidos sincronizados desde la app movil.
          </p>
        </div>
        <button
          onClick={openCreateDevice}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo dispositivo
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={empresaId}
          onChange={(event) => {
            setEmpresaId(event.target.value);
            resetPages();
          }}
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nombre}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Buscar por nombre, celular, servidor o UUID..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            resetPages();
          }}
          className="flex-1 min-w-[220px] max-w-md px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <section>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-800">Dispositivos registrados</h3>
          <p className="text-sm text-gray-500">
            Telefonos que reciben push. Puedes agregarlos desde el panel y luego la app completara el token FCM cuando se registre.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / Servidor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Token FCM</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingDispositivos ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 7 }).map((_, columnIndex) => (
                      <td key={columnIndex} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : dispositivos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No se encontraron dispositivos registrados.
                  </td>
                </tr>
              ) : (
                dispositivos.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 text-sm">{cliente.nombre_usuario}</p>
                      {cliente.nombre_servidor && (
                        <p className="text-xs text-indigo-500 font-medium">{cliente.nombre_servidor}</p>
                      )}
                      <p className="text-xs text-gray-400">{cliente.numero_celular}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {cliente.empresa?.nombre ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      <PlatformBadge plataforma={cliente.plataforma} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {cliente.version_app ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      {cliente.fcm_token ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Registrado
                          </span>
                          <p className="text-xs text-gray-400">{formatToken(cliente.fcm_token)}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Sin token
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge activo={cliente.activo} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditDevice(cliente)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setDeleteTarget(cliente)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination meta={metaDispositivos} page={pageDispositivos} setPage={setPageDispositivos} />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-800">Clientes compartidos</h3>
          <p className="text-sm text-gray-500">
            Contactos creados en la app y sincronizados entre dispositivos de la misma empresa.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingCompartidos ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 5 }).map((_, columnIndex) => (
                      <td key={columnIndex} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : compartidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No se encontraron clientes compartidos.
                  </td>
                </tr>
              ) : (
                compartidos.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 text-sm">{cliente.nombre}</p>
                      {cliente.giro && (
                        <p className="text-xs text-indigo-500 font-medium">{cliente.giro}</p>
                      )}
                      {cliente.direccion && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{cliente.direccion}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cliente.empresa?.nombre ?? '-'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{cliente.celular || '-'}</p>
                      <p className="text-xs text-gray-400">{cliente.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{cliente.dui || '-'}</p>
                      <p className="text-xs text-gray-400">{cliente.registro_iva || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">
                        {cliente.actualizado_por || cliente.creado_por || '-'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(cliente.updated_at)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination meta={metaCompartidos} page={pageCompartidos} setPage={setPageCompartidos} />
        </div>
      </section>

      <Modal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        title={editingDevice ? 'Editar dispositivo' : 'Nuevo dispositivo'}
      >
        <form onSubmit={handleDeviceSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <select
                name="empresa_id"
                value={deviceForm.empresa_id}
                onChange={handleDeviceFormChange}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                  deviceFormErrors.empresa_id
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-indigo-400'
                }`}
              >
                <option value="">Seleccione una empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
              {deviceFormErrors.empresa_id && (
                <p className="mt-1 text-xs text-red-600">{deviceFormErrors.empresa_id[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero celular</label>
              <input
                name="numero_celular"
                value={deviceForm.numero_celular}
                onChange={handleDeviceFormChange}
                placeholder="70001111"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                  deviceFormErrors.numero_celular
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-indigo-400'
                }`}
              />
              {deviceFormErrors.numero_celular && (
                <p className="mt-1 text-xs text-red-600">{deviceFormErrors.numero_celular[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre usuario</label>
              <input
                name="nombre_usuario"
                value={deviceForm.nombre_usuario}
                onChange={handleDeviceFormChange}
                placeholder="OPERADOR 1"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                  deviceFormErrors.nombre_usuario
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-indigo-400'
                }`}
              />
              {deviceFormErrors.nombre_usuario && (
                <p className="mt-1 text-xs text-red-600">{deviceFormErrors.nombre_usuario[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Servidor</label>
              <input
                name="nombre_servidor"
                value={deviceForm.nombre_servidor}
                onChange={handleDeviceFormChange}
                placeholder="SIGA1"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                  deviceFormErrors.nombre_servidor
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-indigo-400'
                }`}
              />
              {deviceFormErrors.nombre_servidor && (
                <p className="mt-1 text-xs text-red-600">{deviceFormErrors.nombre_servidor[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
              <select
                name="plataforma"
                value={deviceForm.plataforma}
                onChange={handleDeviceFormChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="web">Web</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version app</label>
              <input
                name="version_app"
                value={deviceForm.version_app}
                onChange={handleDeviceFormChange}
                placeholder="1.1.0"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                  deviceFormErrors.version_app
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-gray-300 focus:ring-indigo-400'
                }`}
              />
              {deviceFormErrors.version_app && (
                <p className="mt-1 text-xs text-red-600">{deviceFormErrors.version_app[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device UUID</label>
            <input
              name="device_uuid"
              value={deviceForm.device_uuid}
              onChange={handleDeviceFormChange}
              placeholder="uuid-dispositivo"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                deviceFormErrors.device_uuid
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {deviceFormErrors.device_uuid && (
              <p className="mt-1 text-xs text-red-600">{deviceFormErrors.device_uuid[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token FCM</label>
            <textarea
              name="fcm_token"
              value={deviceForm.fcm_token}
              onChange={handleDeviceFormChange}
              rows={3}
              placeholder="Opcional. Si queda vacio, el dispositivo se podra completar cuando la app se registre sola."
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                deviceFormErrors.fcm_token
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {deviceFormErrors.fcm_token && (
              <p className="mt-1 text-xs text-red-600">{deviceFormErrors.fcm_token[0]}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              checked={deviceForm.activo}
              onChange={handleDeviceFormChange}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-400"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">Dispositivo activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeviceModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveDeviceMutation.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold transition"
            >
              {saveDeviceMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar eliminacion"
        maxWidth="max-w-lg"
      >
        <p className="text-gray-600 text-sm mb-6">
          Estas seguro que desea eliminar el dispositivo{' '}
          <strong className="text-gray-800">{deleteTarget?.numero_celular}</strong>? Esta accion no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => deleteDeviceMutation.mutate(deleteTarget.id)}
            disabled={deleteDeviceMutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold transition"
          >
            {deleteDeviceMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
