import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import Icon, { type IconName } from './Icon'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

export default function AdminShell({
  title,
  nav,
  top,
  children,
}: {
  title: string
  nav: NavItem[]
  top?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { profile, session, signOut } = useAuth()
  const { pathname } = useLocation()
  const mobileNavRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const container = mobileNavRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[aria-current="page"]')
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [pathname])

  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-900 lg:flex">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 shadow-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-600/25">
              <Icon name="product" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-white">Underty Menu</p>
              <p className="text-xs font-medium text-slate-400">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {top && <div className="px-3.5 pt-3.5 pb-2">{top}</div>}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-600/25'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon name={n.icon} className="h-5 w-5 shrink-0" />
              <span className="truncate">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 bg-slate-950/50 p-4">
          <div className="rounded-xl bg-white/5 px-3 py-2.5">
            <p className="truncate text-xs font-medium text-slate-300">
              {profile?.full_name || session?.user.email}
            </p>
            <button
              type="button"
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-rose-300"
            >
              <Icon name="logout" className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm">
                <Icon name="product" className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900">Underty Menu</span>
            </div>
          </div>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
            {title}
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 sm:pb-10 lg:p-8">
          {children}
        </main>

        {nav.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
            <nav
              ref={mobileNavRef}
              aria-label="Secciones del panel"
              className="no-scrollbar flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto border-t border-slate-200/90 bg-white/95 px-2.5 py-2 pr-8 shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.08)] backdrop-blur-md"
            >
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex min-w-[74px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold leading-tight tracking-tight transition-all active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-sm shadow-orange-600/25'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon name={n.icon} className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{n.label}</span>
                </NavLink>
              ))}
            </nav>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent"
            />
          </div>
        )}
      </div>
    </div>
  )
}