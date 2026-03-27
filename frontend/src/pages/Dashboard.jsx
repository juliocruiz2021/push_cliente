import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/axios';

const statCards = [
  {
    key: 'empresas_activas',
    label: 'Empresas Activas',
    color: 'bg-blue-500',
    iconBg: 'bg-blue-600',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: 'clientes_activos',
    label: 'Clientes Activos',
    color: 'bg-emerald-500',
    iconBg: 'bg-emerald-600',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'mensajes_hoy',
    label: 'Mensajes Enviados Hoy',
    color: 'bg-violet-500',
    iconBg: 'bg-violet-600',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    key: 'mensajes_fallidos',
    label: 'Mensajes Fallidos',
    color: 'bg-rose-500',
    iconBg: 'bg-rose-600',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function StatCard({ card, value, loading }) {
  return (
    <div className={`${card.color} rounded-2xl p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{card.label}</p>
          <p className="text-4xl font-bold mt-2">
            {loading ? (
              <span className="inline-block w-12 h-8 bg-white/20 rounded animate-pulse" />
            ) : (
              value?.toLocaleString() ?? '—'
            )}
          </p>
        </div>
        <div className={`${card.iconBg} w-14 h-14 rounded-xl flex items-center justify-center shadow-inner`}>
          {card.icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/dashboard').then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Resumen general del sistema</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {isError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          No se pudo cargar la información. Verifique la conexión con el servidor.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            card={card}
            value={data?.[card.key]}
            loading={isLoading}
          />
        ))}
      </div>

      {/* Quick info */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Acceso rápido</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Gestione las empresas desde el menú <strong>Empresas</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Los clientes se registran automáticamente vía API móvil
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-violet-500 rounded-full" />
            Envíe notificaciones push desde <strong>Mensajes</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
