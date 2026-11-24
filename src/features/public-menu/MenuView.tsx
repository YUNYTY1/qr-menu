import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Branch, Product, PublicMenuData, PublicRestaurant, Theme } from '@/types'
import { loadFont, themeVars } from '@/lib/theme'
import { money } from '@/lib/format'
import { prettySentence, prettyTitle } from '@/lib/text'
import {
  buildOrderMessage,
  cleanPhone,
  googleMapsUrl,
  PAYMENT_LABELS,
  whatsappUrl,
  type DeliveryType,
  type PaymentMethod,
} from '@/lib/wa'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/ui/Icon'
import { CartProvider, useCart } from './cart'

interface Props { data: PublicMenuData; slug: string; preview?: boolean }

const FAV = '__fav'

/* ───────── Iconos propios de esta pantalla ───────── */

const PATHS = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M17.5 6.5h.01',
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  tiktok: 'M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
}
type IconName = keyof typeof PATHS

function Ico({ n, className = 'h-5 w-5', fill = false }: { n: IconName; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[n].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
    </svg>
  )
}

const SOCIALS = [
  { k: 'instagram', label: 'Instagram', icon: 'instagram' },
  { k: 'facebook', label: 'Facebook', icon: 'facebook' },
  { k: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { k: 'website', label: 'Sitio web', icon: 'globe' },
] as const

const socialUrl = (v: string) => (v.startsWith('http') ? v : `https://${v}`)
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function isProductAvailable(p: Product, branchId?: string | null): boolean {
  if (!p.is_available) return false
  if (branchId && p.unavailable_branch_ids?.includes(branchId)) return false
  return true
}

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
    .then(() => { }, () => { })
}

function Inner({ data, slug, preview }: Props) {
  const { restaurant: r, theme, branches, categories, products, promotions } = data
  const cart = useCart()
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [branchId, setBranchId] = useState<string | null>(branches[0]?.id ?? null)
  const favKey = `underty-fav-${slug}`
  const [favs, setFavs] = useState<string[]>(() => {
    if (preview) return []
    try {
      const v = JSON.parse(localStorage.getItem(favKey) ?? '[]')
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
    } catch { return [] }
  })
  const cur = r.currency || 'S/'
  // En la vista previa del panel (celular simulado) no se usan clases responsivas
  const rs = (base: string, wide: string) => (preview ? base : `${base} ${wide}`)

  useEffect(() => { if (!preview) cart.sync(products) }, [products]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (preview) return
    try { localStorage.setItem(favKey, JSON.stringify(favs)) } catch { /* sin almacenamiento */ }
  }, [favs, favKey, preview])
  useEffect(() => { if (activeCat === FAV && favs.length === 0) setActiveCat(null) }, [activeCat, favs.length])
  useEffect(() => {
    if (!searchOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSearchOpen(false); setQuery('') } }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [searchOpen])

  const cats = categories.filter((c) => products.some((p) => p.category_id === c.id))
  const branch: Branch | undefined = branches.find((b) => b.id === branchId) ?? branches[0]
  const contact = branch?.whatsapp || r.whatsapp
  const address = branch?.address || r.address

  const q = norm(query.trim())
  const sections: { key: string; title: string; items: Product[] }[] = q
    ? [{ key: 'q', title: 'Resultados', items: products.filter((p) => norm(`${p.name} ${p.description ?? ''}`).includes(q)) }]
    : activeCat === FAV
      ? [{ key: 'fav', title: 'Favoritos', items: products.filter((p) => favs.includes(p.id)) }]
      : cats.filter((c) => !activeCat || c.id === activeCat)
        .map((c) => ({ key: c.id, title: prettyTitle(c.name), items: products.filter((p) => p.category_id === c.id) }))
  const noResults = sections.every((s) => s.items.length === 0)

  function chooseCat(id: string | null) {
    setActiveCat(id)
    if (id && id !== FAV && !preview) track(slug, { category: id })
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
  function toggleFav(id: string) {
    if (preview) return
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  }
  function toggleSearch() {
    if (preview) return
    if (searchOpen) { setSearchOpen(false); setQuery('') } else setSearchOpen(true)
  }

  const gridCls = theme.layout === 'lista'
    ? 'flex flex-col gap-3'
    : `grid grid-cols-1 ${theme.layout === 'grande' ? 'gap-5' : 'gap-4'} ${preview ? '' : 'md:grid-cols-2'}`

  const roundBtn = 'relative flex h-10 w-10 items-center justify-center rounded-2xl bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55 active:scale-90'
  const bubble = rs('h-16 w-16', 'sm:h-[72px] sm:w-[72px]')

  return (
    <div className="relative pb-6">
      {/* Portada */}
      <header>
        <div className={`mx-auto max-w-4xl ${preview ? '' : 'sm:px-4 sm:pt-4'}`}>
          <div className={`relative overflow-hidden bg-[var(--primary)] ${rs('h-44', 'sm:h-64 sm:rounded-3xl')}`}>
            {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
            <div className="absolute right-3 top-3 flex gap-2">
              <button type="button" onClick={toggleSearch} aria-label="Buscar en la carta" aria-pressed={searchOpen} className={roundBtn}>
                <Ico n="search" />
              </button>
              <button type="button" onClick={() => !preview && setCartOpen(true)} aria-label="Ver pedido" className={roundBtn}>
                <Icon name="cart" />
                {!preview && cart.count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--btn)] px-1 text-[10px] font-bold text-[var(--on-btn)]">{cart.count}</span>
                )}
              </button>
            </div>
            {r.description && (
              <p className={`absolute left-4 right-4 line-clamp-2 text-sm font-medium text-white drop-shadow ${rs('bottom-12', 'sm:bottom-14')}`}>{r.description}</p>
            )}
          </div>
        </div>

        {/* Tarjeta del local */}
        <div className={`relative mx-auto max-w-4xl px-4 ${rs('-mt-8', 'sm:-mt-12')}`}>
          <div className="flex gap-4 rounded-3xl bg-[var(--surface)] p-4 text-[var(--card-text)] shadow-xl">
            <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--secondary)] text-3xl font-bold text-[var(--primary)] ${rs('h-20 w-20', 'sm:h-24 sm:w-24')}`}
              style={{ boxShadow: '0 12px 24px -12px var(--primary)' }}>
              {r.logo_url ? <img src={r.logo_url} alt={`Logo de ${r.name}`} className="h-full w-full object-cover" /> : r.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`break-words font-extrabold leading-tight ${rs('text-xl', 'sm:text-2xl')}`}>{r.name}</h1>
              <div className="mt-1.5 space-y-1 text-sm text-[var(--card-muted)]">
                {address && (
                  <p className="flex items-start gap-2"><Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />{address}</p>
                )}
                {r.hours.map((h, i) => (
                  <p key={i} className="flex items-start gap-2"><Ico n="clock" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><span><span className="font-semibold text-[var(--card-text)]">{h.label}:</span> {h.value}</span></p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SOCIALS.map((s) => r.socials?.[s.k] && (
                  <a key={s.k} href={preview ? undefined : socialUrl(r.socials[s.k]!)} target="_blank" rel="noreferrer" aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--card-border)] text-[var(--card-muted)] transition hover:scale-105 hover:text-[var(--primary)]">
                    <Ico n={s.icon} className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="mx-auto mt-4 flex max-w-4xl items-center justify-between gap-3 px-4">
          {contact ? (
            <a href={preview ? undefined : whatsappUrl(contact, `Hola, quisiera consultar en ${r.name}`)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--btn)] px-4 py-2.5 text-sm font-semibold text-[var(--on-btn)] shadow-[0_8px_16px_-8px_var(--btn)] transition active:scale-95">
              <Icon name="chat" className="h-4 w-4" /> Escríbenos por WhatsApp
            </a>
          ) : <span />}
          <button type="button" onClick={() => !preview && setInfoOpen(true)} aria-label="Información del local"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:text-[var(--text)] active:scale-90">
            <Ico n="info" />
          </button>
        </div>

        {branches.length > 1 && (
          <div className="mx-auto mt-4 max-w-4xl px-4">
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Sucursal</p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <button key={b.id} onClick={() => chooseBranch(b.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${b.id === branch?.id ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]' : 'border-[var(--card-border)] bg-[var(--surface)] text-[var(--card-text)]'}`}>{b.name}</button>
              ))}
            </div>
          </div>
        )}

        {searchOpen && (
          <div className="anim-pop-in mx-auto mt-4 max-w-4xl px-4">
            <div className="relative">
              <Ico n="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--card-muted)]" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar plato o bebida…" aria-label="Buscar en la carta"
                className="h-12 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-12 pr-12 text-sm text-[var(--card-text)] outline-none placeholder:text-[var(--card-muted)] focus:border-[var(--primary)]" />
              <button type="button" onClick={toggleSearch} aria-label="Cerrar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--card-muted)] hover:text-[var(--card-text)]">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Promociones */}
      {!q && promotions.length > 0 && (
        <section className="mx-auto mt-6 max-w-4xl px-4" aria-label="Promociones">
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {promotions.map((p) => (
              <article key={p.id} className="w-64 shrink-0 overflow-hidden rounded-3xl bg-[var(--secondary)] text-[var(--on-secondary)] shadow-md">
                {p.image_url && <img src={p.image_url} alt="" loading="lazy" decoding="async" className="h-28 w-full object-cover" />}
                <div className="p-3"><p className="text-sm font-bold">{p.title}</p>{p.description && <p className="mt-0.5 text-xs opacity-80">{p.description}</p>}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Categorías */}
      {!q && cats.length > 0 && (
        <nav className="mx-auto mt-4 max-w-4xl" aria-label="Categorías">
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-4">
            {[{ id: null as string | null, name: 'Todo', image_url: null as string | null }, ...cats, ...(favs.length > 0 && !preview ? [{ id: FAV, name: 'Favoritos', image_url: null as string | null }] : [])].map((c) => {
              const active = activeCat === c.id
              return (
                <button key={c.id ?? 'all'} type="button" onClick={() => chooseCat(c.id)} aria-pressed={active}
                  className={`group flex shrink-0 flex-col items-center gap-2 ${rs('w-[72px]', 'sm:w-20')}`}>
                  <span className={`flex items-center justify-center overflow-hidden rounded-full bg-[var(--secondary)] text-xl font-bold text-[var(--primary)] transition duration-300 ${bubble} ${active ? 'scale-110 shadow-[0_10px_20px_-8px_var(--primary)] ring-[3px] ring-[color:var(--primary)] ring-offset-2 ring-offset-[color:var(--bg)]' : 'ring-1 ring-[color:var(--border)] group-hover:scale-105'}`}
                    style={c.id === null ? { background: 'linear-gradient(135deg, var(--primary), var(--btn))', color: 'var(--on-primary)' } : undefined}>
                    {c.id === null ? <Ico n="grid" className="h-6 w-6" />
                      : c.id === FAV ? <Ico n="heart" className="h-6 w-6" fill />
                        : c.image_url ? <img src={c.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          : prettyTitle(c.name).charAt(0)}
                  </span>
                  <span className={`line-clamp-2 text-center text-[11px] leading-tight ${active ? 'font-bold text-[var(--primary)]' : 'font-medium uppercase tracking-wide text-[var(--muted)]'}`}>{prettyTitle(c.name)}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Productos */}
      <main className="mx-auto max-w-4xl px-4">
        {cats.length === 0 && <p className="py-16 text-center text-sm text-[var(--muted)]">Pronto publicaremos nuestra carta.</p>}
        {cats.length > 0 && noResults && (
          <p className="py-16 text-center text-sm text-[var(--muted)]">{q ? `No encontramos “${query.trim()}” en la carta.` : 'Todavía no tienes favoritos.'}</p>
        )}
        {sections.filter((s) => s.items.length > 0).map((s) => (
          <section key={s.key} className="mt-4">
            <h2 className="mb-4 flex items-baseline gap-2 text-xl font-extrabold uppercase tracking-tight">
              {s.title}<span className="text-sm font-semibold text-[var(--muted)]">({s.items.length})</span>
            </h2>
            <div className={gridCls}>
              {s.items.map((p, i) => {
                const available = isProductAvailable(p, branch?.id)
                return (
                  <ProductCard key={`${activeCat}-${p.id}`} p={p} available={available} theme={theme} cur={cur} preview={!!preview}
                    fav={favs.includes(p.id)} delay={i} onOpen={() => openProduct(p)}
                    onAdd={() => !preview && available && cart.add(p)} onFav={() => toggleFav(p.id)} />
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Barra del pedido */}
      {!preview && cart.count > 0 && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[var(--nav-bg)] via-[var(--nav-bg)] to-transparent p-3">
          <button onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-2xl bg-[var(--btn)] px-5 py-3.5 text-[var(--on-btn)] shadow-xl transition active:scale-[0.99]">
            <span className="flex items-center gap-2 font-semibold"><Icon name="cart" /> Ver pedido ({cart.count})</span>
            <span className="font-bold">{money(cur, cart.total)}</span>
          </button>
        </div>
      )}

      {infoOpen && <InfoSheet r={r} address={address} phone={branch?.phone || r.phone} contact={contact} onClose={() => setInfoOpen(false)} />}
      {selected && (
        <ProductSheet
          p={selected}
          available={isProductAvailable(selected, branch?.id)}
          cur={cur}
          onClose={() => setSelected(null)}
          onAdd={() => {
            if (isProductAvailable(selected, branch?.id)) {
              cart.add(selected)
              setSelected(null)
            }
          }}
        />
      )}
      {cartOpen && (
        <CartSheet
          restaurantId={r.id}
          restaurant={r.name}
          cur={cur}
          branches={branches}
          branchId={branch?.id ?? null}
          onBranch={chooseBranch}
          phone={contact}
          onClose={() => setCartOpen(false)}
          onSent={() => { cart.clear(); setCartOpen(false) }}
        />
      )}
    </div>
  )
}

function Thumb({ p, available, className }: { p: Product; available: boolean; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-[var(--secondary)] ${className}`}>
      <img src={p.image_url ?? ''} alt={prettyTitle(p.name)} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${available ? '' : 'grayscale'}`} />
    </div>
  )
}

function ProductCard({
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

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
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

function InfoSheet({
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

function ProductSheet({
  p,
  available,
  cur,
  onClose,
  onAdd,
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

const FIELD = 'w-full rounded-xl border border-[var(--card-border)] bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--card-muted)] focus:border-[var(--primary)]'

function CartSheet({
  restaurantId,
  restaurant,
  cur,
  branches,
  branchId,
  onBranch,
  phone,
  onClose,
  onSent,
}: {
  restaurantId: string
  restaurant: string
  cur: string
  branches: Branch[]
  branchId: string | null
  onBranch: (id: string) => void
  phone: string | null | undefined
  onClose: () => void
  onSent: () => void
}) {
  const cart = useCart()
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape_plin')
  const [cashAmount, setCashAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)

  const branch = branches.find((b) => b.id === branchId)
  const hasValidDelivery = deliveryType === 'pickup' || address.trim().length >= 4 || !!coords
  const hasValidPhone = deliveryType === 'pickup' || customerPhone.replace(/\D/g, '').length >= 7
  const canSend =
    cart.lines.length > 0 &&
    !!phone &&
    cleanPhone(phone).length >= 9 &&
    customerName.trim().length >= 2 &&
    hasValidPhone &&
    hasValidDelivery &&
    !sending

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocError('Tu navegador no soporta ubicación GPS.')
      return
    }
    setLocLoading(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      (err) => {
        setLocLoading(false)
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Puedes escribir tu dirección manualmente.'
            : 'No se pudo obtener tu ubicación exacta.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function send() {
    if (!phone || !canSend) return
    setSending(true)

    let orderNumber: number | null = null
    let ticketUrl: string | null = null
    const lat = deliveryType === 'delivery' ? coords?.lat ?? null : null
    const lng = deliveryType === 'delivery' ? coords?.lng ?? null : null
    const locationUrl = deliveryType === 'delivery' ? googleMapsUrl(lat, lng) : null

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          delivery_type: deliveryType,
          address: deliveryType === 'delivery' ? (address.trim() || 'Ubicación por GPS') : null,
          reference: deliveryType === 'delivery' ? reference.trim() || null : null,
          latitude: lat,
          longitude: lng,
          payment_method: paymentMethod,
          cash_amount: paymentMethod === 'efectivo' ? cashAmount.trim() || null : null,
          notes: notes.trim() || null,
          items: cart.lines,
          total: cart.total,
        })
        .select('id, order_number')
        .single()

      if (!error && data) {
        orderNumber = data.order_number
        ticketUrl = `${window.location.origin}/pedido/${data.id}`
      }
    } catch {
      // Si falla el guardado, igual abrimos WhatsApp para no perder la venta
    } finally {
      setSending(false)
    }

    const text = buildOrderMessage({
      restaurant,
      branch: branch?.name,
      orderNumber,
      ticketUrl,
      locationUrl,
      deliveryType,
      customerName,
      customerPhone,
      address,
      reference,
      paymentMethod,
      cashAmount,
      lines: cart.lines,
      total: cart.total,
      currency: cur,
      notes,
    })

    window.open(whatsappUrl(phone, text), '_blank', 'noopener')
    setTimeout(() => {
      onSent()
    }, 150)
  }

  return (
    <Sheet onClose={onClose} title="Tu pedido">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Tu pedido</h2>
        <button onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
      </div>

      <div className="space-y-4 p-5">
        {cart.lines.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--card-muted)]">Tu pedido está vacío.</p>
        )}

        {/* Modalidad de entrega */}
        {cart.lines.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--card-border)] p-1">
              {(
                [
                  { id: 'delivery', label: 'Delivery' },
                  { id: 'pickup', label: 'Recojo en tienda' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDeliveryType(opt.id)
                    if (opt.id === 'pickup') {
                      setCoords(null)
                      setLocError(null)
                    }
                  }}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${deliveryType === opt.id
                      ? 'bg-[var(--btn)] text-[var(--on-btn)] shadow-sm'
                      : 'text-[var(--card-muted)] hover:text-[var(--card-text)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Datos de entrega */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">
                Detalle de entrega
              </p>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={80}
                placeholder="Nombre y apellido *"
                className={FIELD}
              />

              <input
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                maxLength={20}
                placeholder={deliveryType === 'delivery' ? 'Celular para el delivery *' : 'Celular de contacto (opcional)'}
                className={FIELD}
              />

              {deliveryType === 'delivery' && (
                <>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={160}
                    placeholder={coords ? 'Dirección de entrega (opcional si usas GPS)' : 'Dirección de entrega *'}
                    className={FIELD}
                  />
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={120}
                    placeholder="Referencia (opcional, ej.: frente al parque)"
                    className={FIELD}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--card-border)] px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        {coords ? 'Ubicación exacta adjunta' : 'Ubicación exacta (opcional)'}
                      </p>
                      <p className="truncate text-[11px] text-[var(--card-muted)]">
                        {coords
                          ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                          : 'Comparte tu pin de GPS para facilitar el envío'}
                      </p>
                    </div>

                    {coords ? (
                      <button
                        type="button"
                        onClick={() => { setCoords(null); setLocError(null) }}
                        className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--card-muted)] hover:text-[var(--card-text)]"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locLoading}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] disabled:opacity-40"
                      >
                        <Icon name="location" className="h-3.5 w-3.5" />
                        {locLoading ? 'Obteniendo...' : 'Usar ubicación'}
                      </button>
                    )}
                  </div>

                  {locError && <p className="text-xs text-red-500">{locError}</p>}
                </>
              )}
            </div>

            {branches.length > 1 && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">Sucursal</span>
                <select
                  value={branchId ?? ''}
                  onChange={(e) => onBranch(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm"
                >
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}

            {/* Resumen de productos */}
            <div className="space-y-3 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">
                Resumen del pedido
              </p>
              {cart.lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  {l.image_url && (
                    <img
                      src={l.image_url}
                      alt={prettyTitle(l.name)}
                      className="h-11 w-11 shrink-0 rounded-xl object-cover bg-[var(--secondary)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{prettyTitle(l.name)}</p>
                    <p className="text-xs text-[var(--card-muted)]">{money(cur, l.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cart.setQty(l.id, l.qty - 1)} aria-label="Quitar uno" className="h-7 w-7 rounded-full border border-[var(--card-border)] text-base leading-none">−</button>
                    <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                    <button onClick={() => cart.setQty(l.id, l.qty + 1)} aria-label="Agregar uno" className="h-7 w-7 rounded-full border border-[var(--card-border)] text-base leading-none">+</button>
                  </div>
                  <p className="w-16 text-right text-sm font-bold">{money(cur, l.price * l.qty)}</p>
                </div>
              ))}
            </div>

            {/* Indicaciones */}
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">Indicaciones (opcional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Ej.: con ají, sin ensalada, timbre malogrado"
                className={FIELD}
              />
            </label>

            {/* Método de pago */}
            <div className="space-y-2.5 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">
                Método de pago
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['yape_plin', 'efectivo', 'tarjeta'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${paymentMethod === pm
                        ? 'border-[var(--btn)] bg-[var(--btn)] text-[var(--on-btn)]'
                        : 'border-[var(--card-border)] text-[var(--card-text)] hover:border-[var(--primary)]'
                      }`}
                  >
                    {PAYMENT_LABELS[pm]}
                  </button>
                ))}
              </div>

              {paymentMethod === 'efectivo' && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  maxLength={12}
                  placeholder={`¿Con cuánto pagas? (opcional, ej.: 50)`}
                  className={FIELD}
                />
              )}
            </div>
          </>
        )}

        {/* Total y envío */}
        <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-4">
          <span className="text-sm text-[var(--card-muted)]">Total estimado</span>
          <span className="text-xl font-bold">{money(cur, cart.total)}</span>
        </div>

        {!phone && <p className="text-xs text-red-500">Este restaurante aún no configuró su WhatsApp.</p>}
        {phone && cart.lines.length > 0 && !canSend && (
          <p className="text-xs text-[var(--card-muted)]">
            Completa tu nombre{deliveryType === 'delivery' ? ', celular y dirección o ubicación GPS' : ''} para enviar el pedido.
          </p>
        )}

        <button
          onClick={send}
          disabled={!canSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn)] py-3.5 font-semibold text-[var(--on-btn)] disabled:opacity-40"
        >
          <Icon name="chat" /> {sending ? 'Generando pedido...' : 'Enviar pedido por WhatsApp'}
        </button>

        <p className="text-center text-xs text-[var(--card-muted)]">Se abrirá WhatsApp con tu pedido listo. Tú lo envías.</p>
        {cart.lines.length > 0 && (
          <button onClick={cart.clear} className="w-full text-center text-xs text-[var(--card-muted)] underline">
            Vaciar pedido
          </button>
        )}
      </div>
    </Sheet>
  )
}