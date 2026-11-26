import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Feedback'

const styles = {
  primary:
    'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-600/25 hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-700 hover:shadow-md hover:shadow-orange-600/30 active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:scale-100 disabled:from-orange-300 disabled:to-orange-300 disabled:shadow-none',
  secondary:
    'bg-white text-slate-700 border border-slate-200/90 shadow-xs hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:scale-100 disabled:opacity-50',
  danger:
    'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-600/20 hover:-translate-y-0.5 hover:from-rose-600 hover:to-rose-700 hover:shadow-md hover:shadow-rose-600/25 active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:scale-100 disabled:from-rose-300 disabled:to-rose-300',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:scale-100 disabled:opacity-50',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof styles
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  // En celular los botones miden al menos 44 px de alto (cómodos para el dedo)
  const sz = size === 'sm'
    ? 'min-h-[40px] px-3 py-1.5 text-xs rounded-xl sm:min-h-0'
    : 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl sm:min-h-0'
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 font-semibold transition-all duration-150 ease-out disabled:cursor-not-allowed ${sz} ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl text-slate-500 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 active:translate-y-0 active:scale-90 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
