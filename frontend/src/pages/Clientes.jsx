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
  const [empresaId, setEmpresaId] = useState('');
  const [search, setSearch] = useState('');
  const [pageDispositivos, setPageDispositivos] = useState(1);
  const [pageCompartidos, setPageCompartidos] = useState(1);

  const { data: empresasData } = useQuery({
    queryKey: ['empresas-all'],
    queryFn: () =>
      apiClient.get('/empresas', { params: { per_page: 100 } }).then((r) => r.data),
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
      }).then((r) => r.data),
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
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const empresas = empresasData?.data ?? [];
  const dispositivos = dispositivosData?.data ?? [];
  const metaDispositivos = dispositivosData?.meta ?? dispositivosData;
  const compartidos = compartidosData?.data ?? [];
  const metaCompartidos = compartidosData?.meta ?? compartidosData;

  const resetPages = () => {
    setPageDispositivos(1);
    setPageCompartidos(1);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          Dispositivos registrados y clientes compartidos sincronizados desde la app movil.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={empresaId}
          onChange={(e) => {
            setEmpresaId(e.target.value);
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
          placeholder="Buscar por nombre, celular, DUI, IVA o email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPages();
          }}
          className="flex-1 min-w-[220px] max-w-md px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <section>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-800">Dispositivos registrados</h3>
          <p className="text-sm text-gray-500">
            Telefonos que reciben push y registran su token FCM.
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingDispositivos ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : dispositivos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
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

          <Pagination
            meta={metaDispositivos}
            page={pageDispositivos}
            setPage={setPageDispositivos}
          />
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {cliente.empresa?.nombre ?? '-'}
                    </td>
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

          <Pagination
            meta={metaCompartidos}
            page={pageCompartidos}
            setPage={setPageCompartidos}
          />
        </div>
      </section>
    </div>
  );
}
