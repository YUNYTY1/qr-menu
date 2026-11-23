import { useEffect, useRef, useState, type ReactNode } from 'react'

export const NAV = [
  ['Funcionalidades', '#funcionalidades'],
  ['Planes', '#planes'],
  ['Preguntas frecuentes', '#faq'],
]


export const FOOD = {
  pollo: { n: 'Pollo a la brasa', d: 'Con papas y ensalada', p: 'S/ 18.00', img: '/landing/pollo.jpg', e: '🍗' },
  ceviche: { n: 'Ceviche clásico', d: 'Pescado del día, limón', p: 'S/ 32.00', img: '/landing/ceviche.jpg', e: '🐟' },
  lomo: { n: 'Lomo a la parrilla', d: 'Con vegetales asados', p: 'S/ 38.00', img: '/landing/lomo.jpg', e: '🥩' },
  mixto: { n: 'Ceviche mixto', d: 'Con mariscos', p: 'S/ 36.00', img: '/landing/ceviche.jpg', e: '🦐' },
  latte: { n: 'Latte', d: 'Arte latte', p: 'S/ 9.00', img: '/landing/latte.jpg', e: '☕' },
  croissant: { n: 'Croissant', d: 'Horneado hoy', p: 'S/ 7.00', img: '/landing/croissant.jpg', e: '🥐' },
}

export type Theme = { head: string; accent: string; bg: string; title: string; tabs: string[]; items: (typeof FOOD)[keyof typeof FOOD][] }

export const THEMES: Theme[] = [
  { head: '#8f4b3e', accent: '#8f4b3e', bg: '#f3e8dc', title: 'Parrilla Don Mario', tabs: ['Carnes', 'Guarniciones'], items: [FOOD.lomo, FOOD.pollo] },
  { head: '#3b9097', accent: '#3b9097', bg: '#e8f1f1', title: 'Cevichería Mar Azul', tabs: ['Ceviches', 'Bebidas'], items: [FOOD.ceviche, FOOD.mixto] },
  { head: '#6b4423', accent: '#6b4423', bg: '#f3e8dc', title: 'Café Rincón', tabs: ['Café', 'Dulces'], items: [FOOD.latte, FOOD.croissant] },
]

export const HERO_THEME: Theme = {
  head: '#f25c26', accent: '#f25c26', bg: '#ffffff', title: 'La Brasa Dorada',
  tabs: ['Platos', 'Ceviches', 'Parrilla'], items: [FOOD.pollo, FOOD.ceviche, FOOD.lomo],
}

/* ───────────── Utilidades ───────────── */

export const PATHS: Record<string, string> = {
  fork: 'M5 3l8 8 M3 5l8 8 M13 3c3 1 5 4 3 7l-2 2 M7 15l-4 4 M21 3l-9 9 M10 14l7 7 M17 4l3 3',
  upload: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M12 17v-6 M9.5 13.5 12 11l2.5 2.5',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4',
  qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v1 M14 20h3 M20 18v3',
  chat: 'M21 12a8 8 0 0 1-11.7 7L4 20l1.2-4.4A8 8 0 1 1 21 12z',
  palette: 'M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.5-2.2-.5-1.2.2-2.3 1.5-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z M7.5 11h.01 M10 7.5h.01 M14.5 7.5h.01',
  list: 'M4 6h3 M4 12h3 M4 18h3 M11 6h9 M11 12h9 M11 18h9',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16v4 M17 18h4',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 0 0 3.4 0',
  chevron: 'M6 9l6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M6 6l12 12 M18 6L6 18',
}

export function I({ n, className = 'h-5 w-5' }: { n: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[n].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
    </svg>
  )
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setShown(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown] as const
}

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}>
      {children}
    </div>
  )
}

export function Food({ item, className }: { item: { img: string; e: string }; className: string }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-amber-200 to-orange-400 ${className}`}>
      {ok ? <img src={item.img} alt="" loading="lazy" onError={() => setOk(false)} className="h-full w-full object-cover" /> : <span>{item.e}</span>}
    </div>
  )
}

// QR decorativo (no escaneable): solo visual
export function QrArt({ className = 'h-24 w-24' }: { className?: string }) {
  const N = 21
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
  const on = (x: number, y: number) => {
    if (finder(x, y)) {
      const lx = x % 14 > 6 ? x - 14 : x, ly = y > 13 ? y - 14 : y
      const edge = lx === 0 || lx === 6 || ly === 0 || ly === 6
      const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
      return edge || core
    }
    return (x * 7 + y * 13 + x * y) % 3 === 0
  }
  const cells: ReactNode[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (on(x, y)) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
  return <svg viewBox={`0 0 ${N} ${N}`} className={className} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">{cells}</svg>
}

/* ───────────── Teléfono ───────────── */

export function Phone({ t, compact = false, frame = '#111827', className = '' }: { t: Theme; compact?: boolean; frame?: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[2.4rem] border-[8px] transition-colors duration-300 ${compact ? 'h-[420px] w-[218px]' : 'h-[570px] w-[272px] sm:h-[610px] sm:w-[300px]'} ${className}`}
      style={{ background: t.bg === '#ffffff' ? '#fdf6ee' : t.bg, borderColor: frame }}>
      <div className="px-4 pb-3 pt-3 text-center text-white transition-colors duration-300" style={{ background: t.head }}>
        <div className="mx-auto mb-3 h-4 w-20 rounded-full bg-gray-900/90" />
        <p className={`font-semibold tracking-widest opacity-80 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>CARTA DIGITAL</p>
        <p className={`font-display font-bold ${compact ? 'text-base' : 'text-xl'}`}>{t.title}</p>
      </div>
      <div className={`flex gap-2 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
        {t.tabs.map((tab, i) => (
          <span key={tab} className={`rounded-full font-semibold ${compact ? 'px-2.5 py-1 text-[9px]' : 'px-3 py-1 text-[11px]'} ${i === 0 ? 'text-white' : 'bg-white text-gray-900'}`}
            style={i === 0 ? { background: t.accent } : undefined}>{tab}</span>
        ))}
      </div>
      <div className={`space-y-2.5 ${compact ? 'px-3' : 'px-3.5'}`}>
        {t.items.map((it) => (
          <div key={it.n} className="flex items-center gap-2.5 rounded-xl bg-white/90 p-2 shadow-sm">
            <Food item={it} className={`rounded-md ${compact ? 'h-11 w-11' : 'h-[70px] w-[70px] text-2xl'}`} />
            <div className="min-w-0 flex-1">
              <p className={`truncate font-bold text-gray-900 ${compact ? 'text-[10px]' : 'text-[13px]'}`}>{it.n}</p>
              <p className={`truncate text-gray-500 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>{it.d}</p>
              <p className={`font-bold ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: t.accent }}>{it.p}</p>
            </div>
            <span className={`flex shrink-0 items-center justify-center rounded-full text-white ${compact ? 'h-5 w-5' : 'h-7 w-7'}`} style={{ background: t.accent }}>
              <I n="plus" className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </span>
          </div>
        ))}
      </div>
      <div className={`absolute inset-x-3 flex items-center justify-center gap-1.5 rounded-full bg-[#25c45f] font-bold text-white shadow-lg ${compact ? 'bottom-3 py-2 text-[10px]' : 'bottom-4 py-3 text-xs'}`}>
        <I n="chat" className={compact ? 'h-3 w-3' : 'h-4 w-4'} /> Pedir por WhatsApp
      </div>
    </div>
  )
}

export function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative h-[570px] w-[272px] overflow-hidden rounded-[2.4rem] border-[8px] border-gray-900 bg-gray-900 sm:h-[610px] sm:w-[300px] ${className}`}>
      <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-gray-900" />
      {children}
    </div>
  )
}
