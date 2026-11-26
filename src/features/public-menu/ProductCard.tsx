import type { Product, Theme } from '@/types'
import { money } from '@/lib/format'
import { prettySentence, prettyTitle } from '@/lib/text'
import Icon from '@/components/ui/Icon'
import { Ico } from './menuHelpers'

export function Thumb({ p, available, className }: { p: Product; available: boolean; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-[var(--secondary)] ${className}`}>
      <img src={p.image_url ?? ''} alt={prettyTitle(p.name)} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${available ? '' : 'grayscale'}`} />
    </div>
  )
}

/** Foto del producto o, si no tiene, un recuadro con su inicial (para que las cuadrículas queden parejas). */
function Media({ p, available, className }: { p: Product; available: boolean; className: string }) {
  if (p.image_url) return <Thumb p={p} available={available} className={className} />
  return (
    <div className={`flex items-center justify-center bg-[var(--secondary)] text-2xl font-bold text-[var(--primary)] ${className}`}>
      {prettyTitle(p.name).charAt(0)}
    </div>
  )
}

function AddBtn({ name, available, onAdd, sm = false }: { name: string; available: boolean; onAdd: () => void; sm?: boolean }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onAdd() }} disabled={!available} aria-label={`Agregar ${name}`}
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--btn)] text-[var(--on-btn)] shadow-[0_8px_16px_-6px_var(--btn)] transition active:scale-90 disabled:opacity-30 disabled:shadow-none ${sm ? 'h-7 w-7' : 'h-9 w-9'}`}>
      <Icon name="plus" className={sm ? 'h-4 w-4' : 'h-5 w-5'} />
    </button>
  )
}

function FavBtn({ fav, onFav, soft = '', overlay = false, sm = false }: { fav: boolean; onFav: () => void; soft?: string; overlay?: boolean; sm?: boolean }) {
  const look = overlay
    ? fav ? 'bg-white/90 text-[var(--primary)]' : 'bg-black/35 text-white backdrop-blur-sm'
    : `-mr-1 -mt-1 ${fav ? 'scale-110 text-[var(--primary)]' : soft}`
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onFav() }} aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'} aria-pressed={fav}
      className={`flex shrink-0 items-center justify-center rounded-full transition duration-200 active:scale-75 ${sm ? 'h-6 w-6' : 'h-8 w-8'} ${look}`}>
      <Ico n="heart" className={sm ? 'h-3.5 w-3.5' : 'h-5 w-5'} fill={fav} />
    </button>
  )
}

const SOLD_OUT_BADGE = 'rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-semibold text-white'

export function ProductCard({
  p, available, theme, cur, preview, fav, delay, onOpen, onAdd, onFav,
}: {
  p: Product
  available: boolean
  theme: Theme
  cur: string
  preview: boolean
  fav: boolean
  delay: number
  onOpen: () => void
  onAdd: () => void
  onFav: () => void
}) {
  const plana = theme.card_style === 'plana'
  const card = plana
    ? 'rounded-none border-b border-[var(--border)] bg-transparent'
    : theme.card_style === 'sombra'
      ? 'rounded-3xl bg-[var(--surface)] shadow-lg shadow-black/10'
      : 'rounded-3xl border border-[var(--card-border)] bg-[var(--surface)]'
  const ink = plana ? 'text-[var(--text)]' : 'text-[var(--card-text)]'
  const soft = plana ? 'text-[var(--muted)]' : 'text-[var(--card-muted)]'
  const layout = theme.layout
  const name = prettyTitle(p.name)
  const desc = p.description ? prettySentence(p.description) : ''
  const pop = { animationDelay: `${Math.min(delay, 8) * 45}ms` }
  const base = `anim-pop-in relative cursor-pointer overflow-hidden transition duration-300 active:scale-[0.99] ${ink} ${card}`

  // ---- Cuadrícula simple: estilo limpio de 2 columnas con foto arriba, botón + flotante, precio y nombre ----
  if (layout === 'simple') {
    return (
      <article onClick={onOpen} style={pop} className="anim-pop-in flex cursor-pointer flex-col text-[var(--text)] transition active:scale-[0.99]">
        <div className="relative">
          <Media p={p} available={available} className="aspect-square w-full rounded-2xl" />
          {!available && (
            <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
              Agotado
            </span>
          )}
          <div className="absolute right-2 top-2">
            <AddBtn name={name} available={available} onAdd={onAdd} />
          </div>
        </div>
        <div className="mt-2 min-w-0">
          <span className="block whitespace-nowrap text-base font-extrabold leading-tight">
            {money(cur, p.price)}
          </span>
          <h3 className="mt-1 line-clamp-2 break-words text-sm font-medium leading-snug text-[var(--muted)]">
            {name}
          </h3>
        </div>
      </article>
    )
  }

  // ---- Cuadrícula (2 columnas) y Carrusel: tarjeta vertical con foto cuadrada ----
  if (layout === 'cuadricula' || layout === 'carrusel') {
    return (
      <article onClick={onOpen} style={pop} className={`${base} flex flex-col ${layout === 'carrusel' ? 'w-40 shrink-0 snap-start' : ''}`}>
        <div className="relative">
          <Media p={p} available={available} className="aspect-square w-full" />
          {!available && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">Agotado</span>}
          <div className="absolute right-1.5 top-1.5"><FavBtn overlay fav={fav} onFav={onFav} /></div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-2.5">
          <h3 className="line-clamp-2 break-words text-sm font-bold leading-snug">{name}</h3>
          {desc && <p className={`mt-0.5 line-clamp-2 text-[11px] leading-snug ${soft}`}>{desc}</p>}
          <div className="mt-auto flex items-center justify-between gap-1.5 pt-2">
            <span className="whitespace-nowrap text-[15px] font-extrabold">{money(cur, p.price)}</span>
            <AddBtn name={name} available={available} onAdd={onAdd} />
          </div>
        </div>
      </article>
    )
  }

  // ---- Cuadrícula compacta (3 columnas): foto, nombre y precio; el detalle se ve al tocar ----
  if (layout === 'compacta') {
    return (
      <article onClick={onOpen} style={pop} className={`${base} flex flex-col`}>
        <div className="relative">
          <Media p={p} available={available} className="aspect-square w-full" />
          {!available && <span className="absolute left-1 top-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">Agotado</span>}
          <div className="absolute right-1 top-1"><FavBtn overlay sm fav={fav} onFav={onFav} /></div>
          <div className="absolute bottom-1.5 right-1.5"><AddBtn sm name={name} available={available} onAdd={onAdd} /></div>
        </div>
        <div className="min-w-0 p-2">
          <h3 className="line-clamp-2 break-words text-xs font-bold leading-tight">{name}</h3>
          <span className="mt-1 block whitespace-nowrap text-sm font-extrabold">{money(cur, p.price)}</span>
        </div>
      </article>
    )
  }

  // ---- Lista solo texto: sin fotos, ideal para cartas largas ----
  if (layout === 'texto') {
    return (
      <article onClick={onOpen} style={pop} className={`${base} flex items-start gap-3 px-3.5 py-3`}>
        <div className="min-w-0 flex-1">
          {!available && <span className={`mb-1 inline-block ${SOLD_OUT_BADGE}`}>Agotado</span>}
          <h3 className="break-words text-[15px] font-bold leading-snug">{name}</h3>
          {desc && <p className={`mt-0.5 line-clamp-2 text-xs leading-snug ${soft}`}>{desc}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="whitespace-nowrap text-base font-extrabold">{money(cur, p.price)}</span>
          <div className="flex items-center gap-1.5">
            <FavBtn fav={fav} onFav={onFav} soft={soft} />
            <AddBtn sm name={name} available={available} onAdd={onAdd} />
          </div>
        </div>
      </article>
    )
  }

  // ---- Horizontal (el diseño clásico), Lista con miniatura y Tarjetas grandes ----
  const big = layout === 'grande'
  const compact = layout === 'lista'
  const hasImg = !!p.image_url
  const imgCls = big
    ? 'aspect-[16/10] w-full'
    : compact
      ? 'order-last m-3 h-20 w-20 rounded-xl'
      : `${preview ? 'w-28' : 'w-32 sm:w-44'} min-h-[8rem] self-stretch ${plana ? 'rounded-xl' : ''}`
  const pad = compact ? 'py-3 pl-3' : preview ? 'p-3' : 'p-3 sm:p-4'

  return (
    <article onClick={onOpen} style={pop} className={`${base} flex ${big ? 'flex-col' : 'flex-row'}`}>
      {hasImg && <Thumb p={p} available={available} className={imgCls} />}
      <div className={`flex min-w-0 flex-1 flex-col ${pad}`}>
        {!available && <span className={`mb-1 inline-block w-fit ${SOLD_OUT_BADGE}`}>Agotado</span>}
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words text-[15px] font-bold leading-snug">{name}</h3>
          <FavBtn fav={fav} onFav={onFav} soft={soft} />
        </div>
        {desc && <p className={`mt-1 line-clamp-2 text-xs leading-snug ${soft}`}>{desc}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="whitespace-nowrap text-lg font-extrabold">{money(cur, p.price)}</span>
          <AddBtn name={name} available={available} onAdd={onAdd} />
        </div>
      </div>
    </article>
  )
}