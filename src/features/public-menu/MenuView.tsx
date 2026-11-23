import { useEffect, useMemo, useState } from 'react'
import type { Branch, Product, PublicMenuData, Theme } from '@/types'
import { loadFont, themeVars } from '@/lib/theme'
import { money } from '@/lib/format'
import { prettySentence, prettyTitle } from '@/lib/text'
import { buildOrderMessage, cleanPhone, whatsappUrl } from '@/lib/wa'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/ui/Icon'
import { CartProvider, useCart } from './cart'

interface Props { data: PublicMenuData; slug: string; preview?: boolean }

/** Vista del menú público. Se reutiliza en la vista previa del panel (preview = true). */
export default function MenuView({ data, slug, preview = false }: Props) {
  useEffect(() => { loadFont(data.theme.font) }, [data.theme.font])
  const vars = useMemo(() => themeVars(data.theme), [data.theme])
  return (
    <CartProvider storageKey={preview ? undefined : `underty-cart-${slug}`}>
      <div style={vars} className="min-h-full text-[var(--text)]">
        <Inner data={data} slug={slug} preview={preview} />
      </div>
    </CartProvider>
  )
}

function track(slug: string, args: { category?: string; product?: string; branch?: string }) {
  supabase.rpc('track_visit', { p_slug: slug, p_category: args.category ?? null, p_product: args.product ?? null, p_branch: args.branch ?? null })
    .then(() => {}, () => {})
}

function Inner({ data, slug, preview }: Props) {
  const { restaurant: r, theme, branches, categories, products, promotions } = data
  const cart = useCart()
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [branchId, setBranchId] = useState<string | null>(branches[0]?.id ?? null)
  const cur = r.currency || 'S/'

  useEffect(() => { if (!preview) cart.sync(products) }, [products]) // eslint-disable-line react-hooks/exhaustive-deps

  const cats = categories.filter((c) => products.some((p) => p.category_id === c.id))
  const shown = cats.filter((c) => !activeCat || c.id === activeCat)
  const branch: Branch | undefined = branches.find((b) => b.id === branchId) ?? branches[0]
  const contact = branch?.whatsapp || r.whatsapp

  function chooseCat(id: string | null) {
    setActiveCat(id)
    if (id && !preview) track(slug, { category: id })
  }
  function chooseBranch(id: string) {
    setBranchId(id)
    if (!preview) track(slug, { branch: id })
  }
  function openProduct(p: Product) {
    if (preview) return
    setSelected(p)
    track(slug, { product: p.id })
  }

  // En la vista previa se usan siempre los tamaños de celular (no dependen del ancho de tu pantalla)
  const grid = theme.layout === 'cuadricula'
    ? `grid grid-cols-2 items-stretch gap-3 ${preview ? '' : 'sm:grid-cols-3'}`
    : theme.layout === 'grande' ? 'grid grid-cols-1 gap-4' : 'flex flex-col gap-3'

  return (
    <div className="relative">
      {/* Portada y datos */}
      <header>
        <div className={`w-full overflow-hidden bg-[var(--primary)] ${preview ? 'h-40' : 'h-40 sm:h-56'}`}>
          {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="mx-auto max-w-3xl px-4">
          <div className="-mt-10 flex items-end gap-3">
            <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--surface)] bg-[var(--surface)] text-2xl font-bold text-[var(--primary)] shadow-md ${preview ? 'h-20 w-20' : 'h-20 w-20 sm:h-24 sm:w-24'}`}>
              {r.logo_url ? <img src={r.logo_url} alt={`Logo de ${r.name}`} className="h-full w-full object-cover" /> : r.name.charAt(0)}
            </div>
          </div>
          <h1 className={`mt-3 break-words font-bold leading-tight ${preview ? 'text-2xl' : 'text-2xl sm:text-3xl'}`}>{r.name}</h1>
          {r.description && <p className="mt-1 text-sm text-[var(--muted)]">{r.description}</p>}
          <div className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
            {r.address && <p className="flex items-start gap-2"><Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />{r.address}</p>}
            {r.hours.map((h, i) => (
              <p key={i}><span className="font-medium text-[var(--text)]">{h.label}:</span> {h.value}</p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {contact && (
              <a href={preview ? undefined : whatsappUrl(contact, `Hola, quisiera consultar en ${r.name}`)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--btn)] px-4 py-2 text-sm font-semibold text-[var(--on-btn)]">
                <Icon name="chat" className="h-4 w-4" /> Escríbenos por WhatsApp
              </a>
            )}
            {(['instagram', 'facebook', 'tiktok', 'website'] as const).map((k) => r.socials?.[k] && (
              <a key={k} href={preview ? undefined : (r.socials[k]!.startsWith('http') ? r.socials[k] : `https://${r.socials[k]}`)} target="_blank" rel="noreferrer"
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium capitalize text-[var(--muted)] hover:text-[var(--text)]">{k === 'website' ? 'Web' : k}</a>
            ))}
          </div>
          {branches.length > 1 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Sucursal</p>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <button key={b.id} onClick={() => chooseBranch(b.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${b.id === branch?.id ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]' : 'border-[var(--card-border)] bg-[var(--surface)] text-[var(--card-text)]'}`}>{b.name}</button>
                ))}
              </div>
              {branch?.address && <p className="mt-1 text-xs text-[var(--muted)]">{branch.address}</p>}
            </div>
          )}
        </div>
      </header>

      {/* Promociones */}
      {promotions.length > 0 && (
        <section className="mx-auto mt-6 max-w-3xl px-4" aria-label="Promociones">
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {promotions.map((p) => (
              <article key={p.id} className="w-64 shrink-0 overflow-hidden rounded-2xl bg-[var(--secondary)] text-[var(--on-secondary)]">
                {p.image_url && <img src={p.image_url} alt="" loading="lazy" decoding="async" className="h-28 w-full object-cover" />}
                <div className="p-3"><p className="text-sm font-bold">{p.title}</p>{p.description && <p className="mt-0.5 text-xs opacity-80">{p.description}</p>}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Categorías */}
      <nav className="sticky top-0 z-10 mt-6 border-b border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur" aria-label="Categorías">
        <div className="no-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
          {[{ id: null as string | null, name: 'Todo' }, ...cats].map((c) => (
            <button key={c.id ?? 'all'} onClick={() => chooseCat(c.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${activeCat === c.id ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]' : 'border-[var(--card-border)] bg-[var(--surface)] text-[var(--card-text)]'}`}>
              {prettyTitle(c.name)}
            </button>
          ))}
        </div>
      </nav>

      {/* Productos */}
      <main className="mx-auto max-w-3xl px-4 pb-8">
        {cats.length === 0 && <p className="py-16 text-center text-sm text-[var(--muted)]">Pronto publicaremos nuestra carta.</p>}
        {shown.map((c) => {
          const items = products.filter((p) => p.category_id === c.id)
          return (
            <section key={c.id} className="mt-6">
              <h2 className="mb-3 text-lg font-bold">{prettyTitle(c.name)}</h2>
              <div className={grid}>
                {items.map((p) => (
                  <ProductCard key={p.id} p={p} theme={theme} cur={cur} onOpen={() => openProduct(p)} onAdd={() => !preview && cart.add(p)} />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      {/* Barra del pedido */}
      {!preview && cart.count > 0 && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[var(--nav-bg)] via-[var(--nav-bg)] to-transparent p-3">
          <button onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-2xl bg-[var(--btn)] px-5 py-3.5 text-[var(--on-btn)] shadow-xl">
            <span className="flex items-center gap-2 font-semibold"><Icon name="cart" /> Ver pedido ({cart.count})</span>
            <span className="font-bold">{money(cur, cart.total)}</span>
          </button>
        </div>
      )}

      {selected && <ProductSheet p={selected} cur={cur} onClose={() => setSelected(null)} onAdd={() => { cart.add(selected); setSelected(null) }} />}
      {cartOpen && (
        <CartSheet restaurant={r.name} cur={cur} branches={branches} branchId={branch?.id ?? null} onBranch={chooseBranch}
          phone={contact} onClose={() => setCartOpen(false)} />
      )}
    </div>
  )
}

function Thumb({ p, className }: { p: Product; className: string }) {
  return (
    <div className={`overflow-hidden bg-[var(--secondary)] ${className}`}>
      <img src={p.image_url ?? ''} alt={prettyTitle(p.name)} loading="lazy" decoding="async" className={`h-full w-full object-cover ${p.is_available ? '' : 'grayscale'}`} />
    </div>
  )
}

function ProductCard({ p, theme, cur, onOpen, onAdd }: { p: Product; theme: Theme; cur: string; onOpen: () => void; onAdd: () => void }) {
  const plana = theme.card_style === 'plana'
  const card = plana
    ? 'rounded-none border-b border-[var(--border)] bg-transparent'
    : theme.card_style === 'sombra'
      ? 'rounded-xl bg-[var(--surface)] shadow-md'
      : 'rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]'
  // En estilo "plana" la tarjeta no tiene fondo propio: el texto usa los colores de la página
  const ink = plana ? 'text-[var(--text)]' : 'text-[var(--card-text)]'
  const soft = plana ? 'text-[var(--muted)]' : 'text-[var(--card-muted)]'
  const imgR = plana ? 'rounded-lg' : ''
  const row = theme.layout === 'lista'
  const hasImg = !!p.image_url
  const desc = p.description ? prettySentence(p.description) : ''
  return (
    <article onClick={onOpen} className={`relative flex cursor-pointer overflow-hidden ${ink} ${card} ${row ? 'gap-3 p-3' : 'h-full flex-col'}`}>
      {!row && hasImg && <Thumb p={p} className={`w-full ${theme.layout === 'grande' ? 'aspect-[16/10]' : 'aspect-[4/3]'} ${imgR}`} />}
      <div className={`flex min-w-0 flex-1 flex-col ${row ? '' : 'p-3'}`}>
        {!p.is_available && <span className="mb-1 inline-block w-fit rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-semibold text-white">Agotado</span>}
        <h3 className="break-words text-sm font-semibold leading-snug">{prettyTitle(p.name)}</h3>
        {desc && <p className={`mt-1 line-clamp-3 text-xs leading-snug ${soft}`}>{desc}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="whitespace-nowrap text-sm font-bold text-[var(--primary)]">{money(cur, p.price)}</span>
          <button onClick={(e) => { e.stopPropagation(); onAdd() }} disabled={!p.is_available} aria-label={`Agregar ${prettyTitle(p.name)}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--btn)] text-[var(--on-btn)] transition active:scale-95 disabled:opacity-30">
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>
      </div>
      {row && hasImg && <Thumb p={p} className={`h-20 w-20 shrink-0 rounded-xl ${imgR}`} />}
    </article>
  )
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] text-[var(--card-text)] shadow-2xl sm:max-w-md sm:rounded-3xl">
        {children}
      </div>
    </div>
  )
}

function ProductSheet({ p, cur, onClose, onAdd }: { p: Product; cur: string; onClose: () => void; onAdd: () => void }) {
  return (
    <Sheet onClose={onClose} title={p.name}>
      {p.image_url ? (
        <div className="relative">
          <Thumb p={p} className="aspect-[4/3] w-full" />
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
        <p className="text-xl font-bold text-[var(--primary)]">{money(cur, p.price)}</p>
        <button onClick={onAdd} disabled={!p.is_available}
          className="mt-2 w-full rounded-xl bg-[var(--btn)] py-3 font-semibold text-[var(--on-btn)] disabled:opacity-40">
          {p.is_available ? 'Agregar al pedido' : 'Agotado'}
        </button>
      </div>
    </Sheet>
  )
}

function CartSheet({ restaurant, cur, branches, branchId, onBranch, phone, onClose }: {
  restaurant: string; cur: string; branches: Branch[]; branchId: string | null; onBranch: (id: string) => void
  phone: string | null | undefined; onClose: () => void
}) {
  const cart = useCart()
  const [notes, setNotes] = useState('')
  const branch = branches.find((b) => b.id === branchId)
  const canSend = cart.lines.length > 0 && !!phone && cleanPhone(phone).length >= 9

  function send() {
    if (!phone) return
    const text = buildOrderMessage({ restaurant, branch: branch?.name, lines: cart.lines, total: cart.total, currency: cur, notes })
    window.open(whatsappUrl(phone, text), '_blank', 'noopener')
  }

  return (
    <Sheet onClose={onClose} title="Tu pedido">
      <div className="flex items-center justify-between border-b border-[var(--card-border)] p-5">
        <h2 className="text-lg font-bold">Tu pedido</h2>
        <button onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
      </div>
      <div className="space-y-4 p-5">
        {cart.lines.length === 0 && <p className="py-6 text-center text-sm text-[var(--card-muted)]">Tu pedido está vacío.</p>}
        {cart.lines.map((l) => (
          <div key={l.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{prettyTitle(l.name)}</p>
              <p className="text-xs text-[var(--card-muted)]">{money(cur, l.price)} c/u</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => cart.setQty(l.id, l.qty - 1)} aria-label="Quitar uno" className="h-8 w-8 rounded-full border border-[var(--card-border)] text-lg leading-none">−</button>
              <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
              <button onClick={() => cart.setQty(l.id, l.qty + 1)} aria-label="Agregar uno" className="h-8 w-8 rounded-full border border-[var(--card-border)] text-lg leading-none">+</button>
            </div>
            <p className="w-20 text-right text-sm font-bold">{money(cur, l.price * l.qty)}</p>
          </div>
        ))}
        {branches.length > 1 && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Sucursal</span>
            <select value={branchId ?? ''} onChange={(e) => onBranch(e.target.value)} className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Indicaciones (opcional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} placeholder="Ej.: sin ají, para recoger en 20 min"
            className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2" />
        </label>
        <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-4">
          <span className="text-sm text-[var(--card-muted)]">Total estimado</span>
          <span className="text-xl font-bold">{money(cur, cart.total)}</span>
        </div>
        {!phone && <p className="text-xs text-red-500">Este restaurante aún no configuró su WhatsApp.</p>}
        <button onClick={send} disabled={!canSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn)] py-3.5 font-semibold text-[var(--on-btn)] disabled:opacity-40">
          <Icon name="chat" /> Enviar pedido por WhatsApp
        </button>
        <p className="text-center text-xs text-[var(--card-muted)]">Se abrirá WhatsApp con tu pedido listo. Tú lo envías.</p>
        {cart.lines.length > 0 && <button onClick={cart.clear} className="w-full text-center text-xs text-[var(--card-muted)] underline">Vaciar pedido</button>}
      </div>
    </Sheet>
  )
}