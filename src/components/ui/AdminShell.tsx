import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import Icon, { type IconName } from './Icon'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

export type NavigationIntent = { type: 'route'; to: string } | { type: 'signOut' }

/** En celular la barra inferior muestra estas pestañas; el resto va en la hoja "Más". */
const MAX_TABS = 4

export default function AdminShell({
  title,
  nav,
  top,
  onInterceptNavigation,
  children,
}: {
  title: string
  nav: NavItem[]
  top?: ReactNode
  onInterceptNavigation?: (intent: NavigationIntent) => boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { profile, session, signOut } = useAuth()
  const { pathname } = useLocation()

  // Con 5 secciones o menos se muestran todas; con más, 4 fijas + "Más"
  const showMore = nav.length > MAX_TABS + 1
  const tabs = showMore ? nav.slice(0, MAX_TABS) : nav
  const extra = showMore ? nav.slice(MAX_TABS) : []
  const isOn = (n: NavItem) => (n.end ? pathname === n.to : pathname === n.to || pathname.startsWith(`${n.to}/`))
  const moreActive = extra.some(isOn)

  // Al cambiar de pantalla se cierran el menú lateral y la hoja "Más"
  useEffect(() => {
    setOpen(false)
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false)
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [moreOpen])

  function handleNavClick(e: MouseEvent<HTMLAnchorElement>, to: string, closeDrawer = false) {
    if (to !== pathname && onInterceptNavigation) {
      const allowed = onInterceptNavigation({ type: 'route', to })
      if (!allowed) {
        e.preventDefault()
        return
      }
    }
    if (closeDrawer) setOpen(false)
  }

  function handleSignOut() {
    if (onInterceptNavigation) {
      const allowed = onInterceptNavigation({ type: 'signOut' })
      if (!allowed) return
    }
    setMoreOpen(false)
    signOut()
  }

  const account = profile?.full_name || session?.user.email

  return (
    <div className="min-h-screen overflow-x-clip bg-[#faf9f7] text-slate-900 lg:flex">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menú lateral: fijo en escritorio, cajón en celular */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 shadow-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-600/25">
              <Icon name="product" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-white">Underty Menu</p>
              <p className="truncate text-xs font-medium text-slate-400">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {top && <div className="px-3.5 pb-2 pt-3.5">{top}</div>}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={(e) => handleNavClick(e, n.to, true)}
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
            <p className="truncate text-xs font-medium text-slate-300">{account}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-rose-300"
            >
              <Icon name="logout" className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (solo celular y tableta) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm">
                <Icon name="product" className="h-4 w-4" />
              </span>
              <span className="truncate text-sm font-bold tracking-tight text-slate-900">Underty Menu</span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">{title}</span>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8">
          {children}
        </main>

        {/* Barra inferior estilo app: pocas pestañas + "Más" */}
        {nav.length > 0 && (
          <nav
            aria-label="Secciones del panel"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden"
          >
            <div
              className="mx-auto grid max-w-xl"
              style={{ gridTemplateColumns: `repeat(${tabs.length + (showMore ? 1 : 0)}, minmax(0, 1fr))` }}
            >
              {tabs.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={(e) => handleNavClick(e, n.to)}
                  className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 pt-1 text-[10px] font-semibold leading-tight active:scale-95"
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-orange-100 text-orange-600' : 'text-slate-500'}`}>
                        <Icon name={n.icon} className="h-5 w-5" />
                      </span>
                      <span className={`max-w-full truncate ${isActive ? 'text-orange-700' : 'text-slate-500'}`}>{n.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
              {showMore && (
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-haspopup="dialog"
                  className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 pt-1 text-[10px] font-semibold leading-tight active:scale-95"
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${moreActive ? 'bg-orange-100 text-orange-600' : 'text-slate-500'}`}>
                    <Icon name="menu" className="h-5 w-5" />
                  </span>
                  <span className={`max-w-full truncate ${moreActive ? 'text-orange-700' : 'text-slate-500'}`}>Más</span>
                </button>
              )}
            </div>
          </nav>
        )}
      </div>

      {/* Hoja "Más": el resto de secciones y la cuenta */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <div className="anim-fade-in absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} />
          <div className="anim-sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-slate-200" aria-hidden="true" />
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Más opciones</p>
            <div className="grid gap-1">
              {extra.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={(e) => handleNavClick(e, n.to)}
                  className={({ isActive }) =>
                    `flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition active:scale-[0.99] ${
                      isActive ? 'bg-orange-50 text-orange-700' : 'text-slate-700 active:bg-slate-100'
                    }`
                  }
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon name={n.icon} className="h-5 w-5" />
                  </span>
                  <span className="truncate">{n.label}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              {account && <p className="truncate px-1 pb-1 text-xs font-medium text-slate-500">{account}</p>}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-rose-600 transition active:bg-rose-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50">
                  <Icon name="logout" className="h-5 w-5" />
                </span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
