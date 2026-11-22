import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/status'
import type { SubStatus } from '@/types'

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Cargando">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="anim-fade-in flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-xs">
        <Spinner className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="anim-pop-in rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-xs"
    >
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2.5 inline-flex items-center rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 transition-all duration-150 hover:bg-rose-200 active:scale-95"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="anim-pop-in rounded-3xl border border-dashed border-slate-300/90 bg-white/90 p-10 text-center shadow-xs">
      <p className="text-base font-bold tracking-tight text-slate-800">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Badge({ status }: { status: SubStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-150 ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Pill({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'amber' | 'green' | 'red'
}) {
  const t = {
    slate: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/70',
    amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80',
    green: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80',
    red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80',
  }[tone]
  return (
    <span className={`anim-pop-in inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-150 ${t}`}>
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 ease-out ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <Card className="anim-pop-in relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-slate-500">{hint}</p>}
    </Card>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="anim-fade-in mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

type ToastType = 'success' | 'error' | 'info'
const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; type: ToastType }[]>([])
  const push = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, msg, type }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500)
  }, [])
  const color = {
    success: 'bg-emerald-600 text-white shadow-emerald-600/25',
    error: 'bg-rose-600 text-white shadow-rose-600/25',
    info: 'bg-slate-900 text-white shadow-slate-900/25',
  }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 inset-x-4 z-[100] flex flex-col items-center gap-2 sm:bottom-5 sm:inset-x-auto sm:right-5 sm:items-end"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`anim-sheet-in pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-xl ${color[t.type]}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}