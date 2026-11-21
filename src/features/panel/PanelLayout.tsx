import { useMemo } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import { effStatus, one, STATUS_LABEL } from '@/lib/status'
import { publicUrl } from '@/lib/tenant'
import { fmtDate } from '@/lib/format'
import type { Plan, Restaurant, Subscription } from '@/types'
import AdminShell, { type NavItem } from '@/components/ui/AdminShell'
import { Badge, ErrorBox, PageLoader } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Form'
import { useAuth } from '@/features/auth/AuthContext'
import { FULL_LIMITS, RestaurantContext, STARTER_LIMITS, type RestaurantCtx } from './RestaurantContext'

export default function PanelLayout() {
  const { rid = '' } = useParams()
  const navigate = useNavigate()
  const { profile, memberships } = useAuth()
  const isSuper = !!profile?.is_superadmin
  const allowed = isSuper || memberships.some((m) => m.restaurant_id === rid)

  const { data, loading, error, reload } = useData(async () => {
    if (!allowed) throw new Error('No tienes acceso a este restaurante.')
    const restaurant = await unwrap<Restaurant>(supabase.from('restaurants').select('*').eq('id', rid).single())
    const sub = await unwrap<any>(supabase.from('subscriptions').select('*, plans(*)').eq('restaurant_id', rid).maybeSingle())
    return { restaurant, sub }
  }, [rid, allowed])

  const ctx: RestaurantCtx | null = useMemo(() => {
    if (!data) return null
    const subscription = data.sub as Subscription | null
    const plan = one<Plan>(subscription?.plans as Plan | Plan[] | null)
    const status = effStatus(subscription)
    return {
      restaurant: data.restaurant, subscription, plan, status,
      limits: isSuper ? FULL_LIMITS : { ...STARTER_LIMITS, ...(plan?.limits ?? {}) },
      canWrite: isSuper || status === 'activo' || status === 'pendiente',
      isSuperadmin: isSuper, reload,
    }
  }, [data, isSuper, reload])

  const base = `/panel/${rid}`
  const nav: NavItem[] = [
    { to: `${base}/products`, label: 'Productos', icon: 'product' },
    { to: `${base}/categories`, label: 'Categorías', icon: 'category' },
    { to: `${base}/promotions`, label: 'Promociones', icon: 'promo' },
    { to: `${base}/theme`, label: 'Apariencia', icon: 'palette' },
    { to: `${base}/qr`, label: 'Código QR', icon: 'qr' },
    { to: `${base}/stats`, label: 'Estadísticas', icon: 'stats' },
    { to: `${base}/info`, label: 'Mi restaurante', icon: 'store' },
  ]

  const top = (
    <div className="space-y-2 rounded-xl bg-slate-800 p-3">
      {isSuper && <Link to={`/superadmin/restaurants/${rid}`} className="block text-xs font-medium text-brand-300 hover:text-brand-200">← Volver a Grupo Underty</Link>}
      {!isSuper && memberships.length > 1 ? (
        <Select value={rid} onChange={(e) => navigate(`/panel/${e.target.value}`)} className="!border-slate-700 !bg-slate-900 !text-white">
          {memberships.map((m) => <option key={m.restaurant_id} value={m.restaurant_id}>{m.restaurant.name}</option>)}
        </Select>
      ) : <p className="truncate text-sm font-semibold text-white">{data?.restaurant.name ?? '…'}</p>}
      {ctx && (
        <div className="flex items-center justify-between">
          <Badge status={ctx.status} />
          <a href={publicUrl(ctx.restaurant.slug)} target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-300 hover:text-white">Ver menú ↗</a>
        </div>
      )}
    </div>
  )

  return (
    <AdminShell title="Panel del restaurante" nav={nav} top={top}>
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {ctx && (
        <RestaurantContext.Provider value={ctx}>
          {!ctx.canWrite && !ctx.isSuperadmin && (
            <div role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Tu suscripción está <strong>{STATUS_LABEL[ctx.status].toLowerCase()}</strong>
              {ctx.subscription?.end_date ? ` (vencimiento: ${fmtDate(ctx.subscription.end_date)})` : ''}. El panel está en modo solo lectura y tu menú público no se muestra. Contacta a Grupo Underty para reactivarlo. Tus datos están seguros.
            </div>
          )}
          {ctx.status === 'pendiente' && (
            <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Tu suscripción está pendiente de confirmación de pago. Mientras tanto puedes seguir configurando tu menú.</div>
          )}
          <Outlet />
        </RestaurantContext.Provider>
      )}
    </AdminShell>
  )
}
