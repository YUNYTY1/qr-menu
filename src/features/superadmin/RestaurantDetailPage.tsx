import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import { effStatus } from '@/lib/status'
import { publicUrl } from '@/lib/tenant'
import type { Restaurant, Subscription } from '@/types'
import { Badge, ErrorBox, PageHeader, PageLoader } from '@/components/ui/Feedback'
import RestaurantInfoForm from '@/features/restaurants/RestaurantInfoForm'
import UsersTab from './UsersTab'
import SubscriptionTab from './SubscriptionTab'

const TABS = [['info', 'Información'], ['users', 'Accesos'], ['sub', 'Suscripción']] as const

export default function RestaurantDetailPage() {
  const { id = '' } = useParams()
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('info')
  const { data, loading, error, reload } = useData(async () => {
    const restaurant = await unwrap<Restaurant>(supabase.from('restaurants').select('*').eq('id', id).single())
    const sub = await unwrap<Subscription | null>(supabase.from('subscriptions').select('*').eq('restaurant_id', id).maybeSingle())
    return { restaurant, sub }
  }, [id])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? 'No encontrado'} onRetry={reload} />
  const { restaurant, sub } = data
  return (
    <div>
      <Link to="/superadmin/restaurants" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">← Restaurantes</Link>
      <PageHeader title={restaurant.name} subtitle={publicUrl(restaurant.slug)}
        actions={<>
          <Badge status={effStatus(sub)} />
          <Link to={`/panel/${restaurant.id}`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Configurar menú</Link>
          <a href={publicUrl(restaurant.slug)} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver menú público ↗</a>
        </>} />
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>
        ))}
      </div>
      <div className="max-w-3xl">
        {tab === 'info' && <RestaurantInfoForm key={restaurant.id + restaurant.slug} restaurant={restaurant} canEditSlug onSaved={reload} />}
        {tab === 'users' && <UsersTab restaurantId={restaurant.id} />}
        {tab === 'sub' && <SubscriptionTab restaurantId={restaurant.id} onChanged={reload} />}
      </div>
    </div>
  )
}
