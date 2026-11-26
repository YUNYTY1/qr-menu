import { useEffect, useMemo, useState } from 'react'
import type { Branch, Product, PublicMenuData } from '@/types'
import { loadFont, themeVars } from '@/lib/theme'
import { money } from '@/lib/format'
import { prettyTitle } from '@/lib/text'
import { whatsappUrl } from '@/lib/wa'
import { supabase } from '@/lib/supabase'
import { isOpenNow } from '@/lib/schedule'
import { mapsUrlFor } from '@/lib/maps'
import Icon from '@/components/ui/Icon'
import { CartProvider, useCart } from './cart'
import { CartSheet } from './CartSheet'
import { InfoSheet, ProductSheet } from './MenuSheets'
import { FAV, Ico, isProductAvailable, norm, SOCIALS, socialUrl } from './menuHelpers'
import { ProductCard } from './ProductCard'

interface Props { data: PublicMenuData; slug: string; preview?: boolean }

/** Vista del menú público. Se reutiliza en la vista previa del panel (preview = true). */
export default function MenuView({ data, slug, preview = false }: Props) {
  useEffect(() => { loadFont(data.theme.font) }, [data.theme.font])
  const vars = useMemo(() => themeVars(data.theme), [data.theme])
  return (
    <CartProvider storageKey={preview ? undefined : `underty-cart-${slug}`}>
      {/* En escritorio el menú se muestra como una tarjeta centrada sobre un fondo neutro; en celular ocupa todo el ancho */}
      <div className={preview ? 'min-h-full' : 'min-h-full sm:min-h-screen sm:bg-stone-200 sm:px-4 sm:py-6'}>
        <div style={vars} className={`min-h-full text-[var(--text)] ${preview ? '' : 'mx-auto sm:min-h-0 sm:max-w-3xl sm:overflow-clip sm:rounded-[2rem] sm:shadow-2xl'}`}>
          <Inner data={data} slug={slug} preview={preview} />
        </div>
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
  const [closedToast, setClosedToast] = useState(false)
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

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])
  const openNow = isOpenNow(r.schedule, r.timezone, now)
  const subtitle = [r.cuisine, r.city].filter(Boolean).join(' · ')
  // Solo se bloquea cuando hay horario configurado y está cerrado (null = sin horario → no bloquea)
  const closed = openNow === false
  function notifyClosed() { setClosedToast(true) }
  useEffect(() => {
    if (!closedToast) return
    const t = setTimeout(() => setClosedToast(false), 3500)
    return () => clearTimeout(t)
  }, [closedToast])

  const cats = categories.filter((c) => products.some((p) => p.category_id === c.id))
  const branch: Branch | undefined = branches.find((b) => b.id === branchId) ?? branches[0]
  const contact = branch?.whatsapp || r.whatsapp
  const address = branch?.address || r.address
  // Ubicación exacta de la sucursal elegida; si la sucursal tiene dirección propia pero no pin, se busca por su dirección
  const mapLocation = branch?.map_location || (branch?.address ? null : r.map_location)
  const mapsHref = mapsUrlFor(mapLocation, address, r.city)

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

  // Contenedor de los productos según la distribución elegida en Apariencia
  const gridCls = (() => {
    switch (theme.layout) {
      case 'lista': return 'flex flex-col gap-3'
      case 'texto': return 'flex flex-col gap-2'
      case 'cuadricula': return `grid grid-cols-2 gap-3 ${preview ? '' : 'sm:grid-cols-3'}`
      case 'compacta': return `grid grid-cols-3 gap-2.5 ${preview ? '' : 'sm:grid-cols-4'}`
      case 'carrusel': return 'no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-1'
      case 'grande': return `grid grid-cols-1 gap-5 ${preview ? '' : 'md:grid-cols-2'}`
      default: return `grid grid-cols-1 gap-4 ${preview ? '' : 'md:grid-cols-2'}` // horizontal
    }
  })()

  const roundBtn = 'relative flex h-10 w-10 items-center justify-center rounded-2xl bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55 active:scale-90'
  const bubble = rs('h-16 w-16', 'sm:h-[72px] sm:w-[72px]')

  return (
    <div className="relative pb-6">
      {/* Portada */}
      <header>
        <div className="mx-auto max-w-4xl">
          <div className={`relative overflow-hidden bg-[var(--primary)] ${rs('h-44', 'sm:h-60')}`}>
            {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30" />
            <div className="absolute right-3 top-3 flex gap-2">
              <button type="button" onClick={toggleSearch} aria-label="Buscar en la carta" aria-pressed={searchOpen} className={roundBtn}>
                <Ico n="search" />
              </button>
              <button type="button" onClick={() => { if (preview) return; if (closed) notifyClosed(); else setCartOpen(true) }} aria-label="Ver pedido" className={roundBtn}>
                <Icon name="cart" />
                {!preview && cart.count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--btn)] px-1 text-[10px] font-bold text-[var(--on-btn)]">{cart.count}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tarjeta del local */}
        <div className={`relative mx-auto max-w-4xl px-4 ${rs('-mt-8', 'sm:-mt-12')}`}>
          <div className="rounded-3xl bg-[var(--surface)] p-4 text-[var(--card-text)] shadow-xl">
            {/* Cabecera: logo + nombre + estado */}
            <div className="flex items-center gap-3.5">
              <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--secondary)] text-3xl font-bold text-[var(--primary)] ${rs('h-16 w-16', 'sm:h-24 sm:w-24')}`}
                style={{ boxShadow: '0 12px 24px -12px var(--primary)' }}>
                {r.logo_url ? <img src={r.logo_url} alt={`Logo de ${r.name}`} className="h-full w-full object-cover" /> : r.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h1 className={`min-w-0 break-words font-extrabold leading-tight ${rs('text-xl', 'sm:text-2xl')}`}>{r.name}</h1>
                  {openNow !== null && (
                    <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${openNow ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${openNow ? 'bg-emerald-600' : 'bg-red-600'}`} />{openNow ? 'Abierto' : 'Cerrado'}
                    </span>
                  )}
                </div>
                {subtitle && <p className="mt-0.5 text-sm text-[var(--card-muted)]">{subtitle}</p>}
              </div>
            </div>

            {/* Dirección y horario a todo el ancho de la card */}
            {(address || r.hours.length > 0) && (
              <div className="mt-3.5 space-y-1.5 text-sm text-[var(--card-muted)]">
                {address && (
                  <a href={preview ? undefined : mapsHref} target="_blank" rel="noreferrer" aria-label="Ver ubicación en el mapa"
                    className="flex items-start gap-2 transition hover:text-[var(--primary)] active:opacity-70">
                    <Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                    <span className="min-w-0">
                      {address}
                      <Icon name="external" className="ml-1 inline h-3.5 w-3.5 align-[-2px] opacity-60" />
                    </span>
                  </a>
                )}
                {r.hours.map((h, i) => (
                  <p key={i} className="flex items-start gap-2"><Ico n="clock" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><span><span className="font-semibold text-[var(--card-text)]">{h.label}:</span> {h.value}</span></p>
                ))}
              </div>
            )}

            {SOCIALS.some((s) => r.socials?.[s.k]) && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {SOCIALS.map((s) => r.socials?.[s.k] && (
                  <a key={s.k} href={preview ? undefined : socialUrl(r.socials[s.k]!)} target="_blank" rel="noreferrer" aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--card-border)] text-[var(--card-muted)] transition hover:scale-105 hover:text-[var(--primary)]">
                    <Ico n={s.icon} className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            )}

            {r.description && (
              <p className="mt-3.5 line-clamp-2 border-t border-[var(--card-border)] pt-3 text-sm leading-snug text-[var(--card-muted)]">{r.description}</p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="mx-auto mt-4 flex max-w-4xl items-center justify-between gap-3 px-5">
          {r.delivery_time ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
              <Ico n="clock" className="h-4 w-4 shrink-0" /><span className="truncate">{r.delivery_time}</span>
            </span>
          ) : <span />}
          <div className="flex shrink-0 items-center gap-2">
            {contact && (
              <a href={preview ? undefined : whatsappUrl(contact, `Hola, quisiera consultar en ${r.name}`)} target="_blank" rel="noreferrer" aria-label="Escribir por WhatsApp"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--btn)] text-[var(--on-btn)] shadow-[0_8px_16px_-8px_var(--btn)] transition active:scale-90">
                <Icon name="whatsapp" className="h-6 w-6" />
              </a>
            )}
            <button type="button" onClick={() => !preview && setInfoOpen(true)} aria-label="Información del local"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:text-[var(--text)] active:scale-90">
              <Ico n="info" />
            </button>
          </div>
        </div>

        {closed && (
          <div role="status" className="mx-auto mt-4 max-w-4xl px-4">
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <Ico n="clock" className="mt-0.5 h-4 w-4 shrink-0" />
              <p><span className="font-semibold">Cerrado por ahora.</span> Puedes ver la carta y escribirnos por WhatsApp; los pedidos se habilitan cuando abramos.</p>
            </div>
          </div>
        )}

        {branches.length > 1 && (
          <div className="mx-auto mt-5 max-w-4xl px-4">
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
          <div className="anim-pop-in mx-auto mt-5 max-w-4xl px-4">
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
        <section className="mx-auto mt-7 max-w-4xl px-4" aria-label="Promociones">
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
        <nav className="mx-auto mt-3 max-w-4xl" aria-label="Categorías">
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 py-5">
            {[{ id: null as string | null, name: 'Todo', image_url: null as string | null }, ...cats, ...(favs.length > 0 && !preview ? [{ id: FAV, name: 'Favoritos', image_url: null as string | null }] : [])].map((c) => {
              const active = activeCat === c.id
              return (
                <button key={c.id ?? 'all'} type="button" onClick={() => chooseCat(c.id)} aria-pressed={active}
                  className={`group flex shrink-0 flex-col items-center gap-2 ${rs('w-20', 'sm:w-24')}`}>
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
                    onAdd={() => { if (preview || !available) return; if (closed) notifyClosed(); else cart.add(p) }} onFav={() => toggleFav(p.id)} />
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Barra del pedido */}
      {!preview && !closed && cart.count > 0 && (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[var(--nav-bg)] via-[var(--nav-bg)] to-transparent p-3">
          <button onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-2xl bg-[var(--btn)] px-5 py-3.5 text-[var(--on-btn)] shadow-xl transition active:scale-[0.99]">
            <span className="flex items-center gap-2 font-semibold"><Icon name="cart" /> Ver pedido ({cart.count})</span>
            <span className="font-bold">{money(cur, cart.total)}</span>
          </button>
        </div>
      )}

      {closedToast && (
        <div role="alert" className="anim-pop-in fixed inset-x-0 bottom-6 z-30 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-stone-900 px-4 py-3 text-center text-sm font-medium text-white shadow-xl">
          El local está cerrado. Podrás hacer tu pedido cuando abra.
        </div>
      )}

      {infoOpen && <InfoSheet r={r} address={address} mapHref={mapsHref} phone={branch?.phone || r.phone} contact={contact} onClose={() => setInfoOpen(false)} />}
      {selected && (
        <ProductSheet
          p={selected}
          available={isProductAvailable(selected, branch?.id)}
          closed={closed}
          cur={cur}
          onClose={() => setSelected(null)}
          onAdd={() => {
            if (!closed && isProductAvailable(selected, branch?.id)) {
              cart.add(selected)
              setSelected(null)
            }
          }}
        />
      )}
      {cartOpen && !closed && (
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