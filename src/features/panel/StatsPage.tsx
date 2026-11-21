import { useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, StatCard } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Form'
import PlanGate from './PlanGate'
import { useRestaurant } from './RestaurantContext'

interface Stats {
  days: number; total: number; branch_stats_enabled: boolean
  by_day: { date: string; visits: number }[]
  top_categories: { name: string; visits: number }[]
  top_products: { name: string; visits: number }[]
  by_branch: { name: string; visits: number }[]
}

export default function StatsPage() {
  const { restaurant, limits } = useRestaurant()
  return (
    <div>
      <PageHeader title="Estadísticas" subtitle="Visitas a tu menú digital." />
      <PlanGate allowed={limits.stats} feature="Las estadísticas"><Inner rid={restaurant.id} /></PlanGate>
    </div>
  )
}

function Inner({ rid }: { rid: string }) {
  const [days, setDays] = useState(30)
  const { data, loading, error, reload } = useData(
    () => unwrap<Stats>(supabase.rpc('get_restaurant_stats', { p_restaurant: rid, p_days: days })), [rid, days])

  const max = Math.max(1, ...(data?.by_day.map((d) => d.visits) ?? [1]))
  return (
    <>
      <div className="mb-4 max-w-[200px]">
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option>
        </Select>
      </div>
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Visitas al menú" value={data.total} hint={`Últimos ${data.days} días`} />
            <StatCard label="Promedio diario" value={(data.total / data.days).toFixed(1)} />
            <StatCard label="Mejor día" value={Math.max(0, ...data.by_day.map((d) => d.visits))} />
          </div>
          <Card>
            <h2 className="mb-4 font-semibold">Visitas por día</h2>
            <div className="flex h-40 items-end gap-0.5" role="img" aria-label="Gráfico de visitas por día">
              {data.by_day.map((d) => (
                <div key={d.date} title={`${d.date}: ${d.visits}`} className="flex-1 rounded-t bg-brand-500/80 hover:bg-brand-600"
                  style={{ height: `${Math.max(2, (d.visits / max) * 100)}%` }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-400"><span>{data.by_day[0]?.date}</span><span>{data.by_day[data.by_day.length - 1]?.date}</span></div>
          </Card>
          <div className="grid gap-5 md:grid-cols-2">
            <Ranking title="Categorías más visitadas" rows={data.top_categories} />
            <Ranking title="Productos más consultados" rows={data.top_products} />
          </div>
          {data.branch_stats_enabled && <Ranking title="Interés por sucursal (selecciones)" rows={data.by_branch} />}
        </div>
      )}
    </>
  )
}

function Ranking({ title, rows }: { title: string; rows: { name: string; visits: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.visits))
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? <EmptyState title="Sin datos aún" /> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between text-sm"><span className="truncate">{r.name}</span><span className="font-semibold">{r.visits}</span></div>
              <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.visits / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
