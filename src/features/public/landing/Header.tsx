import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { I, NAV } from './shared'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState('')
  const bar = useRef<HTMLSpanElement>(null)

  // Entrada: la barra baja suavemente al cargar la página
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(r)
  }, [])

  // Se compacta al hacer scroll + barra de progreso de lectura
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8)
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  // Resalta el enlace de la sección que estás viendo
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const els = NAV.map(([, h]) => document.getElementById(h.slice(1))).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id)
        else setActive((cur) => (cur === e.target.id ? '' : cur))
      }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Cerrar el menú móvil con Escape
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-all duration-700 ease-out ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} ${
        scrolled || open ? 'border-orange-100 bg-cream/80 shadow-md shadow-orange-900/5 backdrop-blur-md' : 'border-transparent bg-cream/95'
      }`}
    >
      <div className={`mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 transition-[padding] duration-300 ${scrolled ? 'py-2' : 'py-3.5'}`}>
        <a href="#top" onClick={() => setOpen(false)} className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-md shadow-accent/30 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 group-active:scale-90 sm:h-10 sm:w-10">
            <I n="fork" />
          </span>
          <span className="text-base font-extrabold tracking-tight max-[359px]:hidden sm:text-lg">Underty Menu</span>
        </a>

        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          {NAV.map(([label, href]) => {
            const on = active === href.slice(1)
            return (
              <a key={href} href={href}
                className={`relative hidden px-3 py-2 transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-accent after:transition-transform after:duration-300 hover:text-gray-900 hover:after:scale-x-100 lg:block ${
                  on ? 'text-gray-900 after:scale-x-100' : 'text-gray-600 after:scale-x-0'
                }`}>
                {label}
              </a>
            )
          })}
          <Link to="/login" className="relative hidden px-3 py-2 text-gray-600 transition-colors duration-200 after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-300 hover:text-gray-900 hover:after:scale-x-100 lg:block">
            Iniciar sesión
          </Link>

          <Link to="/registro"
            className="group relative overflow-hidden rounded-full bg-accent px-3.5 py-2 text-[13px] font-bold text-white shadow-lg shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-accent/40 active:translate-y-0 active:scale-95 sm:px-5 sm:py-2.5 sm:text-sm">
            <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 transition-transform duration-700 ease-out group-hover:translate-x-[400%]" />
            <span className="relative">Empezar gratis</span>
          </Link>

          <button type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-orange-100 active:scale-90 lg:hidden">
            <span className="relative h-5 w-5">
              <I n="menu" className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${open ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
              <I n="close" className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`} />
            </span>
          </button>
        </nav>
      </div>

      {open && (
        <div className="border-t border-orange-100 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-3 text-base font-semibold">
            {[...NAV, ['Iniciar sesión', '/login']].map(([label, href], i) => {
              const cls = `anim-pop-in flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-orange-100/60 active:bg-orange-100 ${active === href.slice(1) ? 'text-accent' : ''}`
              const style = { animationDelay: `${i * 60}ms` }
              return href.startsWith('/')
                ? <Link key={href} to={href} onClick={() => setOpen(false)} className={cls} style={style}>{label}</Link>
                : <a key={href} href={href} onClick={() => setOpen(false)} className={cls} style={style}>{label}{active === href.slice(1) && <span className="h-2 w-2 rounded-full bg-accent" />}</a>
            })}
          </div>
        </div>
      )}

      {/* Progreso de lectura */}
      <span ref={bar} className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-accent" aria-hidden="true" />
    </header>
  )
}