import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/axios';

function PlatformBadge({ plataforma }) {
  const styles = {
    android: 'bg-green-100 text-green-700',
    ios: 'bg-blue-100 text-blue-700',
    web: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[plataforma] ?? 'bg-gray-100 text-gray-600'}`}>
      {plataforma ?? '—'}
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

export default function Clientes() {
  const [empresaId, setEmpresaId] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Load empresas for the filter
  const { data: empresasData } = useQuery({
    queryKey: ['empresas-all'],
    queryFn: () => apiClient.get('/empresas', { params: { per_page: 100 } }).then((r) => r.data),
    staleTime: 300_000,
  });

  const empresas = empresasData?.data ?? [];

  // Load clientes
  const { data, isLoading } = useQuery({
    queryKey: ['clientes', empresaId, page, search],
    queryFn: () =>
      apiClient
        .get('/clientes', {
          params: {
            empresa_id: empresaId || undefined,
            page,
            search: search || undefined,
            per_page: 15,
          },
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const clientes = data?.data ?? [];
  const meta = data?.meta ?? data;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          Los clientes se registran automáticamente desde la aplicación móvil
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={empresaId}
          onChange={(e) => { setEmpresaId(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar por nombre o celular..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] max-w-sm px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plataforma</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Versión</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Token FCM</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                  No se encontraron clientes registrados.
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800 text-sm">{cliente.nombre_usuario}</p>
                    <p className="text-xs text-gray-400">{cliente.numero_celular}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {cliente.empresa?.nombre ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <PlatformBadge plataforma={cliente.plataforma} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cliente.version_app ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    {cliente.fcm_token ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Registrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Sin token
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge activo={cliente.activo} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {meta?.last_page > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
            <span>
              Página {meta.current_page} de {meta.last_page} &mdash; {meta.total} registros
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Anterior
              </button>
              <button
                disabled={page === meta.last_page}
                onClick={() => setPage((p) => p + 1)}
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
