import { Link } from 'react-router-dom'
import { I, NAV } from './shared'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><I n="fork" /></span><span className="text-lg font-extrabold">Underty Menu</span></div>
            <p className="mt-3 text-sm text-gray-300">Un producto de Grupo Underty</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            {NAV.map(([label, href]) => <a key={href} href={href} className="hover:text-accent">{label}</a>)}
            <Link to="/login" className="hover:text-accent">Iniciar sesión</Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-white/10 pt-6 text-sm text-gray-300">© {new Date().getFullYear()} Grupo Underty</p>
      </div>
    </footer>
  )
}