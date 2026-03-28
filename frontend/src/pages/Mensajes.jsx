import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/axios';
import { useNotif } from '../contexts/NotifContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

const ESTADO_STYLES = {
  enviado:  'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  fallido:  'bg-red-100 text-red-700',
};

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}

// Intenta parsear el cuerpo como JSON; devuelve null si no es válido.
function parseCuerpo(cuerpo) {
  try { return JSON.parse(cuerpo); } catch { return null; }
}

// ─── Modal Enviar ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { registro_iva: '', numero_destino: '', titulo: '', cuerpo: '', payload: '' };

function ModalEnviar({ empresas, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: (payload) => apiClient.post('/mensajes/enviar', payload),
    onSuccess: (res) => {
      setResult({ type: 'success', message: res.data.message, id: res.data.mensaje_id });
      setForm(EMPTY_FORM);
      setErrors({});
      onSuccess?.();
    },
    onError: (err) => {
      const data = err.response?.data;
      if (err.response?.status === 422 && data?.errors) setErrors(data.errors);
      setResult({ type: 'error', message: data?.message ?? 'Error al enviar.' });
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
    if (result) setResult(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.registro_iva) errs.registro_iva = ['Seleccione una empresa.'];
    if (!form.numero_destino.trim()) errs.numero_destino = ['Requerido.'];
    if (!form.titulo.trim()) errs.titulo = ['Requerido.'];
    if (!form.cuerpo.trim()) errs.cuerpo = ['Requerido.'];
    let parsedPayload = null;
    if (form.payload.trim()) {
      try { parsedPayload = JSON.parse(form.payload); }
      catch { errs.payload = ['JSON inválido.']; }
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutation.mutate({ registro_iva: form.registro_iva, numero_destino: form.numero_destino, titulo: form.titulo, cuerpo: form.cuerpo, payload: parsedPayload });
  };

  const inp = (hasErr) =>
    `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition bg-white ${hasErr ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Enviar notificación
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {result && (
            <div className={`rounded-xl px-4 py-3 text-sm border ${result.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {result.message}
              {result.id && <span className="text-xs ml-2 opacity-70">(ID: {result.id})</span>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
              <select name="registro_iva" value={form.registro_iva} onChange={handleChange} className={inp(errors.registro_iva)}>
                <option value="">-- Seleccione --</option>
                {empresas.map((e) => <option key={e.id} value={e.registro_iva}>{e.nombre} ({e.registro_iva})</option>)}
              </select>
              {errors.registro_iva && <p className="mt-1 text-xs text-red-600">{errors.registro_iva[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Número de destino</label>
              <input name="numero_destino" value={form.numero_destino} onChange={handleChange} placeholder="63092051" className={inp(errors.numero_destino)} />
              {errors.numero_destino && <p className="mt-1 text-xs text-red-600">{errors.numero_destino[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
              <input name="titulo" value={form.titulo} onChange={handleChange} placeholder="Título" maxLength={200} className={inp(errors.titulo)} />
              {errors.titulo && <p className="mt-1 text-xs text-red-600">{errors.titulo[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuerpo del mensaje</label>
              <input name="cuerpo" value={form.cuerpo} onChange={handleChange} placeholder="Texto" maxLength={1000} className={inp(errors.cuerpo)} />
              {errors.cuerpo && <p className="mt-1 text-xs text-red-600">{errors.cuerpo[0]}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payload adicional <span className="text-gray-400 font-normal">(JSON opcional)</span></label>
            <textarea name="payload" value={form.payload} onChange={handleChange} rows={3}
              placeholder={'{\n  "orden_id": "123"\n}'}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 transition resize-none ${errors.payload ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'}`}
            />
            {errors.payload && <p className="mt-1 text-xs text-red-600">{errors.payload[0]}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
              {mutation.isPending ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Enviando...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Enviar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Campo de formulario visual ───────────────────────────────────────────────
function CampoForm({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</p>
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800">{value}</div>
    </div>
  );
}

// ─── Modal Detalle (muestra campos del JSON + empresa + servidor) ──────────────
function ModalDetalle({ msg, onClose }) {
  if (!msg) return null;

  const json        = parseCuerpo(msg.cuerpo);
  const data        = (json?.data ?? json) ?? {};
  const empresa     = msg.empresa?.nombre ?? '—';
  const servidor    = msg.cliente_empresa?.nombre_servidor ?? '—';
  const operador    = msg.cliente_empresa?.nombre_usuario  ?? '—';
  const destino     = msg.numero_destino ?? '—';
  const esFactura   = !!(data.nombre || data.dui || data.registro_iva || data.giro || data.concepto);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">{msg.titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Empresa y servidor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Empresa</p>
              <p className="text-sm font-bold text-indigo-800">{empresa}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Servidor</p>
              <p className="text-sm font-bold text-indigo-800">{servidor}</p>
            </div>
          </div>

          {/* Destinatario y estado */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Operador</p>
              <p className="text-gray-800">{operador} · <span className="text-gray-500">{destino}</span></p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Estado / Fecha</p>
              <div className="flex items-center gap-2 flex-wrap">
                <EstadoBadge estado={msg.estado} />
                <span className="text-xs text-gray-500">{formatDate(msg.enviado_at ?? msg.created_at)}</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Campos del JSON si es solicitud de factura */}
          {esFactura ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CampoForm label="Nombre / Razón social" value={data.nombre} />
              <CampoForm label="DUI / NIT" value={data.dui} />
              <CampoForm label="Registro IVA" value={data.registro_iva} />
              <CampoForm label="Giro" value={data.giro} />
              <CampoForm label="Celular" value={data.celular} />
              <CampoForm label="Email" value={data.email} />
              <div className="sm:col-span-2">
                <CampoForm label="Dirección" value={data.direccion} />
              </div>
              <CampoForm label="Concepto" value={data.concepto} />
              <CampoForm label="Monto" value={data.monto != null ? `$${parseFloat(data.monto).toFixed(2)}` : null} />
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cuerpo</p>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all">{msg.cuerpo}</pre>
            </div>
          )}

          {/* Payload extra si existe */}
          {msg.payload_json && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Payload adicional</p>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap">{JSON.stringify(msg.payload_json, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Mensajes() {
  const queryClient                               = useQueryClient();
  const { nuevosMensajes, marcarLeidos, registrarOnNuevos } = useNotif();
  const [showEnviar, setShowEnviar]               = useState(false);
  const [detalle, setDetalle]                     = useState(null);
  const [page, setPage]                           = useState(1);
  const [filters, setFilters]                     = useState({
    registro_iva: '',
    estado: '',
    fecha_desde: todayISO(),
    fecha_hasta: todayISO(),
    search: '',
  });

  // Cuando llegan mensajes nuevos, refrescar la lista automáticamente
  useEffect(() => {
    const unsub = registrarOnNuevos(() => {
      queryClient.invalidateQueries({ queryKey: ['historial'] });
    });
    return unsub;
  }, [registrarOnNuevos, queryClient]);

  const { data: empresasData } = useQuery({
    queryKey: ['empresas-all'],
    queryFn: () => apiClient.get('/empresas', { params: { per_page: 100 } }).then((r) => r.data),
    staleTime: 300_000,
  });
  const empresas = empresasData?.data ?? [];

  const queryParams = {
    page,
    per_page: 20,
    ...(filters.registro_iva && { registro_iva: filters.registro_iva }),
    ...(filters.estado && { estado: filters.estado }),
    ...(filters.fecha_desde && { fecha_desde: filters.fecha_desde }),
    ...(filters.fecha_hasta && { fecha_hasta: filters.fecha_hasta }),
    ...(filters.search.trim() && { search: filters.search.trim() }),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['historial', queryParams],
    queryFn: () => apiClient.get('/mensajes/historial', { params: queryParams }).then((r) => r.data),
    keepPreviousData: true,
  });

  const mensajes = data?.data ?? [];
  const meta     = data?.meta ?? data;

  const setFilter = (key, value) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
  };

  const limpiarFiltros = () => {
    setFilters({ registro_iva: '', estado: '', fecha_desde: todayISO(), fecha_hasta: todayISO(), search: '' });
    setPage(1);
  };

  const inp = 'px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Mensajes</h2>
          <p className="text-gray-500 text-sm mt-0.5">Historial de notificaciones push enviadas</p>
        </div>
        <button
          onClick={() => setShowEnviar(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Enviar notificación
        </button>
      </div>

      {/* Banner de mensajes nuevos */}
      {nuevosMensajes.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block" />
              {nuevosMensajes.length} mensaje(s) nuevo(s)
            </p>
            <button onClick={marcarLeidos} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Marcar como vistos
            </button>
          </div>
          <div className="space-y-2">
            {nuevosMensajes.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setDetalle(msg)}
                className="w-full text-left bg-white border border-indigo-100 rounded-xl px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{msg.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-indigo-600">{msg.empresa?.nombre ?? '—'}</span>
                      {msg.cliente_empresa?.nombre_servidor && (
                        <> · <span className="text-gray-600">{msg.cliente_empresa.nombre_servidor}</span></>
                      )}
                      <> · {msg.numero_destino}</>
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDate(msg.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={filters.registro_iva} onChange={(e) => setFilter('registro_iva', e.target.value)} className={inp}>
            <option value="">Todas las empresas</option>
            {empresas.map((e) => <option key={e.id} value={e.registro_iva}>{e.nombre}</option>)}
          </select>

          <select value={filters.estado} onChange={(e) => setFilter('estado', e.target.value)} className={inp}>
            <option value="">Todos los estados</option>
            <option value="enviado">Enviado</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
          </select>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={filters.fecha_desde} onChange={(e) => setFilter('fecha_desde', e.target.value)} className={inp} />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={filters.fecha_hasta} onChange={(e) => setFilter('fecha_hasta', e.target.value)} className={inp} />
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Buscar..."
              className={`${inp} pl-9 w-full`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            {meta?.total != null ? `${meta.total} mensaje(s) encontrado(s)` : ''}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400">Actualizando...</span>}
          </span>
          <button onClick={limpiarFiltros} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition">
            Restablecer filtros (hoy)
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatario / Servidor</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : mensajes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm">No hay mensajes con los filtros seleccionados</p>
                  </div>
                </td>
              </tr>
            ) : (
              mensajes.map((msg) => (
                <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-800">{msg.cliente_empresa?.nombre_usuario ?? '—'}</p>
                    <p className="text-xs text-gray-400">{msg.numero_destino}</p>
                    {msg.cliente_empresa?.nombre_servidor && (
                      <p className="text-xs text-indigo-500 font-medium">{msg.cliente_empresa.nombre_servidor}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-700">{msg.empresa?.nombre ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-800 font-medium">{msg.titulo}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{msg.cuerpo?.slice(0, 60)}{msg.cuerpo?.length > 60 ? '…' : ''}</p>
                  </td>
                  <td className="px-5 py-3"><EstadoBadge estado={msg.estado} /></td>
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(msg.enviado_at ?? msg.created_at)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setDetalle(msg)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium transition"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {meta?.last_page > 1 && (
          <div className="px-5 py-4 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
            <span>Página {meta.current_page} de {meta.last_page} · {meta.total} total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Anterior
              </button>
              <button disabled={page === meta.last_page} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showEnviar && (
        <ModalEnviar
          empresas={empresas}
          onClose={() => setShowEnviar(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['historial'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setTimeout(() => setShowEnviar(false), 1500);
          }}
        />
      )}
      {detalle && <ModalDetalle msg={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
