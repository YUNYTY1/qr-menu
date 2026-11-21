import { Link } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import { fmtDate } from '@/lib/format'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, StatCard } from '@/components/ui/Feedback'

interface Stats {
  total: number; activos: number; pendientes: number; vencidos: number; suspendidos: number; cancelados: number
  ingresos_total: number; ingresos_mes: number
  proximos: { restaurant_id: string; name: string; slug: string; end_date: string; days_left: number }[]
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useData(async () => {
    await supabase.rpc('refresh_subscription_status') // marca como vencidas las suscripciones con fecha pasada
    return unwrap<Stats>(supabase.rpc('get_platform_stats'))
  }, [])

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen de la plataforma Underty Menu." />
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Restaurantes" value={data.total} />
            <StatCard label="Activos" value={data.activos} hint={`${data.pendientes} pendientes`} />
            <StatCard label="Suspendidos" value={data.suspendidos} hint={`${data.cancelados} cancelados`} />
            <StatCard label="Suscripciones vencidas" value={data.vencidos} />
            <StatCard label="Ingresos registrados" value={`S/ ${Number(data.ingresos_total).toFixed(2)}`} />
            <StatCard label="Ingresos del mes" value={`S/ ${Number(data.ingresos_mes).toFixed(2)}`} />
          </div>
          <Card>
            <h2 className="mb-3 font-semibold">Próximos vencimientos (15 días)</h2>
            {data.proximos.length === 0 ? <EmptyState title="Sin vencimientos próximos" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">Restaurante</th><th>Vence</th><th>Días</th></tr></thead>
                  <tbody>
                    {data.proximos.map((p) => (
                      <tr key={p.restaurant_id} className="border-b border-slate-100">
                        <td className="py-2.5"><Link to={`/superadmin/restaurants/${p.restaurant_id}`} className="font-medium text-brand-700 hover:underline">{p.name}</Link></td>
                        <td>{fmtDate(p.end_date)}</td>
                        <td className={p.days_left <= 3 ? 'font-semibold text-red-600' : ''}>{p.days_left}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
