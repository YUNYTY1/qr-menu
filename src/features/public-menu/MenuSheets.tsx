import { useEffect, type ReactNode } from 'react'
import type { Product, Promotion, PublicRestaurant } from '@/types'
import { money } from '@/lib/format'
import { prettySentence, prettyTitle } from '@/lib/text'
import { cleanPhone, whatsappUrl } from '@/lib/wa'
import Icon from '@/components/ui/Icon'
import { Ico, SOCIALS, socialUrl } from './menuHelpers'
import { Thumb } from './ProductCard'

export function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="anim-fade-in fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="anim-sheet-in max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] text-[var(--card-text)] shadow-2xl sm:max-w-md sm:rounded-3xl">
        {children}
      </div>
    </div>
  )
}

export function InfoSheet({
  r, address, mapHref, phone, contact, onClose,
}: {
  r: PublicRestaurant
  address: string | null | undefined
  mapHref?: string
  phone: string | null | undefined
  contact: string | null | undefined
  onClose: () => void
}) {
  return (
    <Sheet onClose={onClose} title="Información del local">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Información</h2>
        <button onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
      </div>
      <div className="space-y-4 p-5 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--secondary)] text-xl font-bold text-[var(--primary)]">
            {r.logo_url ? <img src={r.logo_url} alt="" className="h-full w-full object-cover" /> : r.name.charAt(0)}
          </div>
          <div>
            <p className="text-base font-bold">{r.name}</p>
            {(r.cuisine || r.city) && <p className="text-xs text-[var(--card-muted)]">{[r.cuisine, r.city].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        {r.description && <p className="text-[var(--card-muted)]">{r.description}</p>}
        {address && (
          <a href={mapHref} target="_blank" rel="noreferrer" aria-label="Ver ubicación en el mapa"
            className="flex items-start gap-2 transition hover:text-[var(--primary)]">
            <Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
            <span className="underline decoration-dotted underline-offset-2">{address}</span>
            <Icon name="external" className="mt-1 h-3.5 w-3.5 shrink-0 opacity-60" />
          </a>
        )}
        {r.delivery_time && <p className="flex items-center gap-2"><Ico n="clock" className="h-4 w-4 shrink-0 text-[var(--primary)]" />Entrega: {r.delivery_time}</p>}
        {phone && (
          <a href={`tel:${cleanPhone(phone)}`} className="flex items-center gap-2"><Ico n="phone" className="h-4 w-4 shrink-0 text-[var(--primary)]" />{phone}</a>
        )}
        {r.hours.length > 0 && (
          <div className="space-y-1.5 border-t border-[var(--card-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">Horario</p>
            {r.hours.map((h, i) => <p key={i}><span className="font-semibold">{h.label}:</span> {h.value}</p>)}
          </div>
        )}
        {SOCIALS.some((s) => r.socials?.[s.k]) && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-4">
            {SOCIALS.map((s) => r.socials?.[s.k] && (
              <a key={s.k} href={socialUrl(r.socials[s.k]!)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--card-muted)] hover:text-[var(--primary)]">
                <Ico n={s.icon} className="h-4 w-4" />{s.label}
              </a>
            ))}
          </div>
        )}
        {contact && (
          <a href={whatsappUrl(contact, `Hola, quisiera consultar en ${r.name}`)} target="_blank" rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn)] py-3 font-semibold text-[var(--on-btn)]">
            <Icon name="whatsapp" /> Escríbenos por WhatsApp
          </a>
        )}
      </div>
    </Sheet>
  )
}

export function ProductSheet({
  p,
  available,
  closed = false,
  cur,
  onClose,
  onAdd,
}: {
  p: Product
  available: boolean
  closed?: boolean
  cur: string
  onClose: () => void
  onAdd: () => void
}) {
  return (
    <Sheet onClose={onClose} title={p.name}>
      {p.image_url ? (
        <div className="relative">
          <Thumb p={p} available={available} className="aspect-[4/3] w-full" />
          <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white"><Icon name="close" className="h-5 w-5" /></button>
        </div>
      ) : (
        <div className="flex justify-end p-3">
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-black/10 p-1.5"><Icon name="close" className="h-5 w-5" /></button>
        </div>
      )}
      <div className="space-y-2 p-5 pt-3">
        <h2 className="text-xl font-bold">{prettyTitle(p.name)}</h2>
        {p.description && <p className="text-sm text-[var(--card-muted)]">{prettySentence(p.description)}</p>}
        <p className="text-xl font-extrabold text-[var(--primary)]">{money(cur, p.price)}</p>
        <button onClick={onAdd} disabled={!available || closed}
          className="mt-2 w-full rounded-xl bg-[var(--btn)] py-3 font-semibold text-[var(--on-btn)] transition active:scale-[0.98] disabled:opacity-40">
          {closed ? 'Cerrado por ahora' : available ? 'Agregar al pedido' : 'Agotado'}
        </button>
      </div>
    </Sheet>
  )
}

export function PromotionSheet({
  promo,
  onClose,
}: {
  promo: Promotion
  onClose: () => void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  if (!promo.image_url) return null

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={promo.title}
        onMouseDown={(e) => e.stopPropagation()}
        className="anim-pop-in relative max-h-[90vh] max-w-2xl overflow-hidden rounded-3xl shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar promoción"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 active:scale-90"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
        <img
          src={promo.image_url}
          alt={promo.title}
          className="max-h-[85vh] w-auto max-w-full rounded-3xl object-contain"
        />
      </div>
    </div>
  )
}