import { useEffect, type ReactNode } from 'react'
import type { Product, PublicRestaurant } from '@/types'
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
  r, address, phone, contact, onClose,
}: {
  r: PublicRestaurant
  address: string | null | undefined
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
          <p className="text-base font-bold">{r.name}</p>
        </div>
        {r.description && <p className="text-[var(--card-muted)]">{r.description}</p>}
        {address && <p className="flex items-start gap-2"><Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />{address}</p>}
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
            <Icon name="chat" /> Escríbenos por WhatsApp
          </a>
        )}
      </div>
    </Sheet>
  )
}

export function ProductSheet({
  p, available, cur, onClose, onAdd,
}: {
  p: Product
  available: boolean
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
        <button onClick={onAdd} disabled={!available}
          className="mt-2 w-full rounded-xl bg-[var(--btn)] py-3 font-semibold text-[var(--on-btn)] transition active:scale-[0.98] disabled:opacity-40">
          {available ? 'Agregar al pedido' : 'Agotado'}
        </button>
      </div>
    </Sheet>
  )
}