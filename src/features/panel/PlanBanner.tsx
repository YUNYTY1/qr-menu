import { Link } from 'react-router-dom'
import { todayLima } from '@/lib/format'
import { useRestaurant } from './RestaurantContext'

const daysUntil = (iso: string) =>
  Math.ceil((Date.parse(`${iso}T00:00:00`) - Date.parse(`${todayLima()}T00:00:00`)) / 86400000)

/** Aviso dentro del panel: prueba gratis, vencimiento próximo o pago pendiente. */
export default function PlanBanner() {
  const { restaurant, subscription, status, isSuperadmin } = useRestaurant()
  if (isSuperadmin || !subscription) return null
  const to = `/panel/${restaurant.id}/plan`
  const days = subscription.end_date ? daysUntil(subscription.end_date) : null

  if (status === 'pendiente' && days !== null) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <span>🎁 Prueba gratuita: te {days === 1 ? 'queda 1 día' : `quedan ${Math.max(days, 0)} días`}. Elige tu plan para no perder tu menú.</span>
        <Link to={to} className="rounded-lg bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800">Elegir plan</Link>
      </div>
    )
  }
  if (status === 'pendiente') {
    return <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">Tu suscripción está pendiente de confirmación de pago. Mientras tanto puedes seguir configurando tu menú.</div>
  }
  if (status === 'activo' && days !== null && days <= 5) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <span>Tu plan vence {days <= 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`}. Renueva para que tu menú no se interrumpa.</span>
        <Link to={to} className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800">Renovar</Link>
      </div>
    )
  }
  return null
}
