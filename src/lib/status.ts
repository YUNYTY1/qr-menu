import type { SubStatus, Subscription } from '@/types'
import { todayLima } from './format'

export const STATUS_LABEL: Record<SubStatus, string> = {
  activo: 'Activo', pendiente: 'Pendiente', vencido: 'Vencido', suspendido: 'Suspendido', cancelado: 'Cancelado',
}
export const STATUS_COLOR: Record<SubStatus, string> = {
  activo: 'bg-emerald-100 text-emerald-800',
  pendiente: 'bg-amber-100 text-amber-800',
  vencido: 'bg-red-100 text-red-800',
  suspendido: 'bg-slate-200 text-slate-700',
  cancelado: 'bg-slate-200 text-slate-500',
}

/** Estado real: una suscripción "activo" con fecha pasada se considera vencida. */
export function effStatus(s: Pick<Subscription, 'status' | 'end_date'> | null | undefined): SubStatus {
  if (!s) return 'pendiente'
  if ((s.status === 'activo' || s.status === 'pendiente') && s.end_date && s.end_date < todayLima()) return 'vencido'
  return s.status
}

export const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)
