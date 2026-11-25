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
  const big = theme.layout === 'grande'
  const compact = theme.layout === 'lista'
  const hasImg = !!p.image_url
  const desc = p.description ? prettySentence(p.description) : ''
  const imgCls = big
    ? 'aspect-[16/10] w-full'
    : compact
      ? 'order-last m-3 h-20 w-20 rounded-xl'
      : `${preview ? 'w-28' : 'w-32 sm:w-44'} min-h-[8rem] self-stretch ${plana ? 'rounded-xl' : ''}`
  const pad = compact ? 'py-3 pl-3' : preview ? 'p-3' : 'p-3 sm:p-4'

  return (
    <article onClick={onOpen} style={{ animationDelay: `${Math.min(delay, 8) * 45}ms` }}
      className={`anim-pop-in relative flex cursor-pointer overflow-hidden transition duration-300 active:scale-[0.99] ${big ? 'flex-col' : 'flex-row'} ${ink} ${card}`}>
      {hasImg && <Thumb p={p} available={available} className={imgCls} />}
      <div className={`flex min-w-0 flex-1 flex-col ${pad}`}>
        {!available && <span className="mb-1 inline-block w-fit rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-semibold text-white">Agotado</span>}
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words text-[15px] font-bold leading-snug">{prettyTitle(p.name)}</h3>
          <button type="button" onClick={(e) => { e.stopPropagation(); onFav() }} aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'} aria-pressed={fav}
            className={`-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-200 active:scale-75 ${fav ? 'scale-110 text-[var(--primary)]' : soft}`}>
            <Ico n="heart" className="h-5 w-5" fill={fav} />
          </button>
        </div>
        {desc && <p className={`mt-1 line-clamp-2 text-xs leading-snug ${soft}`}>{desc}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="whitespace-nowrap text-lg font-extrabold">{money(cur, p.price)}</span>
          <button onClick={(e) => { e.stopPropagation(); onAdd() }} disabled={!available} aria-label={`Agregar ${prettyTitle(p.name)}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--btn)] text-[var(--on-btn)] shadow-[0_8px_16px_-6px_var(--btn)] transition active:scale-90 disabled:opacity-30 disabled:shadow-none">
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  )
}