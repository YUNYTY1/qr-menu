import { useCallback, useMemo, useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import { effStatus, one, STATUS_LABEL } from '@/lib/status'
import { publicUrl } from '@/lib/tenant'
import { fmtDate } from '@/lib/format'
import type { Plan, Restaurant, Subscription } from '@/types'
import AdminShell, { type NavItem, type NavigationIntent } from '@/components/ui/AdminShell'
import { Badge, ErrorBox, PageLoader } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Form'
import { useAuth } from '@/features/auth/AuthContext'
import {
  FULL_LIMITS,
  RestaurantContext,
  STARTER_LIMITS,
  type PendingNavigationAction,
  type RestaurantCtx,
} from './RestaurantContext'
import PlanBanner from './PlanBanner'
import SupportButton from './SupportButton'

export default function PanelLayout() {
  const { rid = '' } = useParams()
  const navigate = useNavigate()
  const { profile, memberships, signOut } = useAuth()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingNavigationAction>(null)
  const isSuper = !!profile?.is_superadmin
  const allowed = isSuper || memberships.some((m) => m.restaurant_id === rid)

  const handleInterceptNavigation = useCallback(
    (intent: NonNullable<PendingNavigationAction>) => {
      if (!hasUnsavedChanges) return true
      setPendingAction(intent)
      return false
    },
    [hasUnsavedChanges]
  )

  function confirmLeave() {
    const action = pendingAction
    setPendingAction(null)
    setHasUnsavedChanges(false)
    if (!action) return
    if (action.type === 'route') navigate(action.to)
    else if (action.type === 'signOut') signOut()
  }

  function cancelLeave() {
    setPendingAction(null)
  }

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
      restaurant: data.restaurant,
      subscription,
      plan,
      status,
      limits: isSuper ? FULL_LIMITS : { ...STARTER_LIMITS, ...(plan?.limits ?? {}) },
      canWrite: isSuper || status === 'activo' || status === 'pendiente',
      isSuperadmin: isSuper,
      reload,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      requestNavigation: handleInterceptNavigation,
    }
  }, [data, isSuper, reload, hasUnsavedChanges, handleInterceptNavigation])

  const base = `/panel/${rid}`
  const nav: NavItem[] = [
    { to: `${base}/products`, label: 'Productos', icon: 'product' },
    { to: `${base}/categories`, label: 'Categorías', icon: 'category' },
    { to: `${base}/promotions`, label: 'Promociones', icon: 'promo' },
    { to: `${base}/theme`, label: 'Apariencia', icon: 'palette' },
    { to: `${base}/qr`, label: 'Código QR', icon: 'qr' },
    { to: `${base}/stats`, label: 'Estadísticas', icon: 'stats' },
    { to: `${base}/info`, label: 'Mi restaurante', icon: 'store' },
    { to: `${base}/plan`, label: 'Mi plan', icon: 'plans' },
  ]

  const top = (
    <div className="space-y-2.5 rounded-2xl border border-white/10 bg-slate-800/90 p-3.5 shadow-inner">
      {isSuper && (
        <Link
          to={`/superadmin/restaurants/${rid}`}
          onClick={(e) => {
            if (!handleInterceptNavigation({ type: 'route', to: `/superadmin/restaurants/${rid}` })) {
              e.preventDefault()
            }
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-orange-300 transition hover:text-orange-200"
        >
          ← Volver a Grupo Underty
        </Link>
      )}
      {!isSuper && memberships.length > 1 ? (
        <Select
          value={rid}
          onChange={(e) => {
            const target = `/panel/${e.target.value}`
            if (!handleInterceptNavigation({ type: 'route', to: target })) return
            navigate(target)
          }}
          className="!rounded-xl !border-slate-700 !bg-slate-900 !text-white"
        >
          {memberships.map((m) => (
            <option key={m.restaurant_id} value={m.restaurant_id}>
              {m.restaurant.name}
            </option>
          ))}
        </Select>
      ) : (
        <p className="truncate text-sm font-semibold tracking-tight text-white">
          {data?.restaurant.name ?? 'Cargando carta…'}
        </p>
      )}
      {ctx && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <Badge status={ctx.status} />
          <a
            href={publicUrl(ctx.restaurant.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-100 transition hover:bg-orange-500 hover:text-white"
          >
            Ver menú ↗
          </a>
        </div>
      )}
    </div>
  )

  return (
    <AdminShell
      title="Editor de carta"
      nav={nav}
      top={top}
      onInterceptNavigation={(intent: NavigationIntent) => handleInterceptNavigation(intent)}
    >
      {loading && !ctx && <PageLoader />}
      {error && !ctx && <ErrorBox message={error} onRetry={reload} />}
      {ctx && (
        <RestaurantContext.Provider value={ctx}>
          {!ctx.canWrite && !ctx.isSuperadmin && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm"
            >
              Tu suscripción está <strong>{STATUS_LABEL[ctx.status].toLowerCase()}</strong>
              {ctx.subscription?.end_date ? ` (vencimiento: ${fmtDate(ctx.subscription.end_date)})` : ''}. El panel está en modo solo lectura y tu menú público no se muestra. Para reactivarlo, paga tu plan en{' '}
              <Link to={`${base}/plan`} className="font-semibold underline">Mi plan</Link>. Tus datos están seguros.
            </div>
          )}
          <PlanBanner />
          <Outlet />
        </RestaurantContext.Provider>
      )}

      {/* Soporte por WhatsApp: solo para dueños de restaurante (no para el superadmin) */}
      {!isSuper && <SupportButton restaurantName={data?.restaurant.name} />}

      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          onClick={cancelLeave}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="unsaved-modal-title" className="text-base font-bold text-slate-900">
                  Tienes cambios sin guardar
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Si sales de <strong>Apariencia</strong> ahora, perderás los cambios que hiciste en tu menú y no se publicarán.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelLeave}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quedarme y guardar
              </button>
              <button
                type="button"
                onClick={confirmLeave}
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              >
                Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}