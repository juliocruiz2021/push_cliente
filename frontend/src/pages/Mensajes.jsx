import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/axios';

const EMPTY_FORM = {
  registro_iva: '',
  numero_destino: '',
  titulo: '',
  cuerpo: '',
  payload: '',
};

function EstadoBadge({ estado }) {
  const styles = {
    enviado: 'bg-emerald-100 text-emerald-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
    fallido: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function Mensajes() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [sendResult, setSendResult] = useState(null);
  const [historialIva, setHistorialIva] = useState('');
  const [historialPage, setHistorialPage] = useState(1);

  // Load empresas for the select
  const { data: empresasData } = useQuery({
    queryKey: ['empresas-all'],
    queryFn: () => apiClient.get('/empresas', { params: { per_page: 100 } }).then((r) => r.data),
    staleTime: 300_000,
  });

  const empresas = empresasData?.data ?? [];

  // Historial query
  const { data: historialData, isLoading: historialLoading } = useQuery({
    queryKey: ['historial', historialIva, historialPage],
    queryFn: () =>
      apiClient
        .get('/mensajes/historial', {
          params: { registro_iva: historialIva, page: historialPage, per_page: 15 },
        })
        .then((r) => r.data),
    enabled: Boolean(historialIva),
    keepPreviousData: true,
  });

  const sendMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/mensajes/enviar', payload),
    onSuccess: (res) => {
      setSendResult({ type: 'success', message: res.data.message, id: res.data.mensaje_id });
      setForm(EMPTY_FORM);
      setFormErrors({});
      queryClient.invalidateQueries({ queryKey: ['historial'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const data = err.response?.data;
      if (err.response?.status === 422 && data?.errors) {
        setFormErrors(data.errors);
      }
      setSendResult({
        type: 'error',
        message: data?.error ?? data?.message ?? 'Error al enviar la notificación.',
      });
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
    if (sendResult) setSendResult(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.registro_iva) errs.registro_iva = ['Seleccione una empresa.'];
    if (!form.numero_destino.trim()) errs.numero_destino = ['El número de destino es obligatorio.'];
    if (!form.titulo.trim()) errs.titulo = ['El título es obligatorio.'];
    if (!form.cuerpo.trim()) errs.cuerpo = ['El cuerpo del mensaje es obligatorio.'];

    let parsedPayload = null;
    if (form.payload.trim()) {
      try {
        parsedPayload = JSON.parse(form.payload);
      } catch {
        errs.payload = ['El payload debe ser un JSON válido.'];
      }
    }

    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    sendMutation.mutate({
      registro_iva: form.registro_iva,
      numero_destino: form.numero_destino,
      titulo: form.titulo,
      cuerpo: form.cuerpo,
      payload: parsedPayload,
    });
  };

  const historialMensajes = historialData?.data ?? [];
  const historialMeta = historialData?.meta ?? historialData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Mensajes</h2>
        <p className="text-gray-500 text-sm mt-0.5">Envío de notificaciones push e historial</p>
      </div>

      {/* Send Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 text-base mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Enviar notificación push
        </h3>

        {sendResult && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm flex items-start gap-2 border ${
            sendResult.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {sendResult.type === 'success' ? (
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>
              {sendResult.message}
              {sendResult.id && <span className="text-xs ml-2 opacity-70">(ID: {sendResult.id})</span>}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              name="registro_iva"
              value={form.registro_iva}
              onChange={(e) => {
                handleChange(e);
                setHistorialIva(e.target.value);
                setHistorialPage(1);
              }}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition bg-white ${
                formErrors.registro_iva ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            >
              <option value="">-- Seleccione una empresa --</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.registro_iva}>
                  {e.nombre} ({e.registro_iva})
                </option>
              ))}
            </select>
            {formErrors.registro_iva && (
              <p className="mt-1 text-xs text-red-600">{formErrors.registro_iva[0]}</p>
            )}
          </div>

          {/* Numero destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de destino</label>
            <input
              name="numero_destino"
              value={form.numero_destino}
              onChange={handleChange}
              placeholder="+591 70000000"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.numero_destino ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.numero_destino && (
              <p className="mt-1 text-xs text-red-600">{formErrors.numero_destino[0]}</p>
            )}
          </div>

          {/* Titulo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              placeholder="Título de la notificación"
              maxLength={200}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.titulo ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.titulo && (
              <p className="mt-1 text-xs text-red-600">{formErrors.titulo[0]}</p>
            )}
          </div>

          {/* Cuerpo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuerpo del mensaje</label>
            <input
              name="cuerpo"
              value={form.cuerpo}
              onChange={handleChange}
              placeholder="Texto de la notificación"
              maxLength={1000}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                formErrors.cuerpo ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.cuerpo && (
              <p className="mt-1 text-xs text-red-600">{formErrors.cuerpo[0]}</p>
            )}
          </div>

          {/* Payload JSON */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payload adicional{' '}
              <span className="text-gray-400 font-normal">(JSON opcional)</span>
            </label>
            <textarea
              name="payload"
              value={form.payload}
              onChange={handleChange}
              rows={3}
              placeholder={'{\n  "orden_id": "123",\n  "tipo": "pago"\n}'}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 transition resize-none ${
                formErrors.payload ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
            />
            {formErrors.payload && (
              <p className="mt-1 text-xs text-red-600">{formErrors.payload[0]}</p>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {sendMutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar notificación
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Historial de mensajes</h3>
          {historialIva && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              Empresa: {historialIva}
            </span>
          )}
        </div>

        {!historialIva ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Seleccione una empresa para ver el historial de mensajes.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinatario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Enviado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historialLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : historialMensajes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">
                    No hay mensajes en el historial para esta empresa.
                  </td>
                </tr>
              ) : (
                historialMensajes.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">
                        {msg.cliente_empresa?.nombre_usuario ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">{msg.numero_destino}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800 font-medium">{msg.titulo}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{msg.cuerpo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <EstadoBadge estado={msg.estado} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(msg.enviado_at ?? msg.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {historialMeta?.last_page > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
            <span>Página {historialMeta.current_page} de {historialMeta.last_page}</span>
            <div className="flex gap-2">
              <button
                disabled={historialPage === 1}
                onClick={() => setHistorialPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Anterior
              </button>
              <button
                disabled={historialPage === historialMeta.last_page}
                onClick={() => setHistorialPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
