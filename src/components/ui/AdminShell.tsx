import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import Icon, { type IconName } from './Icon'

export interface NavItem { to: string; label: string; icon: IconName; end?: boolean }

export default function AdminShell({ title, nav, top, children }: { title: string; nav: NavItem[]; top?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { profile, session, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon name="product" /></div>
          <div><p className="text-sm font-bold leading-tight text-white">Underty Menu</p><p className="text-xs text-slate-400">{title}</p></div>
        </div>
        {top && <div className="px-3 pb-3">{top}</div>}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Icon name={n.icon} className="h-5 w-5" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="truncate text-xs text-slate-400">{profile?.full_name || session?.user.email}</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">
            <Icon name="logout" className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-lg p-1.5 hover:bg-slate-100"><Icon name="menu" /></button>
          <span className="text-sm font-semibold">Underty Menu</span>
        </div>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
