import { useEffect, useMemo, useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import {
  BG_MODES, CARD_STYLES, DEFAULT_THEME, FONTS, GRADIENTS, LAYOUTS, TEMPLATES, TEXTURES,
  gradientCss, isDarkColor, textureStyle,
} from '@/lib/theme'
import { todayLima } from '@/lib/format'
import type { Branch, Category, Product, Promotion, PublicMenuData, Theme } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, ErrorBox, PageHeader, PageLoader, useToast } from '@/components/ui/Feedback'
import { ColorField, Field, Select } from '@/components/ui/Form'
import ImageUpload from '@/components/ui/ImageUpload'
import MenuView from '@/features/public-menu/MenuView'
import { useRestaurant } from './RestaurantContext'

const HEX = /^#[0-9a-fA-F]{6}$/

/** Dibujo esquemático de cada distribución, para elegirla a simple vista. */
function LayoutThumb({ id }: { id: Theme['layout'] }) {
  const a = 'fill-slate-300'
  const b = 'fill-slate-200'
  return (
    <svg viewBox="0 0 60 40" className="h-14 w-full bg-slate-50" aria-hidden="true">
      {id === 'horizontal' && (
        <>
          <rect x="4" y="4" width="20" height="14" rx="2" className={a} />
          <rect x="28" y="6" width="26" height="3" rx="1.5" className={a} />
          <rect x="28" y="12" width="16" height="3" rx="1.5" className={b} />
          <rect x="4" y="22" width="20" height="14" rx="2" className={a} />
          <rect x="28" y="24" width="26" height="3" rx="1.5" className={a} />
          <rect x="28" y="30" width="16" height="3" rx="1.5" className={b} />
        </>
      )}
      {id === 'cuadricula' && (
        <>
          <rect x="4" y="4" width="24" height="18" rx="2" className={a} />
          <rect x="32" y="4" width="24" height="18" rx="2" className={a} />
          <rect x="4" y="26" width="18" height="3" rx="1.5" className={b} />
          <rect x="32" y="26" width="18" height="3" rx="1.5" className={b} />
          <rect x="4" y="32" width="12" height="3" rx="1.5" className={a} />
          <rect x="32" y="32" width="12" height="3" rx="1.5" className={a} />
        </>
      )}
      {id === 'compacta' && (
        <>
          {[4, 22, 40].map((x) => (
            <g key={x}>
              <rect x={x} y="4" width="16" height="14" rx="2" className={a} />
              <rect x={x} y="21" width="16" height="2.5" rx="1.25" className={b} />
              <rect x={x} y="27" width="16" height="9" rx="2" className={a} />
            </g>
          ))}
        </>
      )}
      {id === 'lista' && (
        <>
          {[5, 16, 27].map((y) => (
            <g key={y}>
              <rect x="4" y={y} width="34" height="3" rx="1.5" className={a} />
              <rect x="4" y={y + 5} width="22" height="3" rx="1.5" className={b} />
              <rect x="44" y={y - 1} width="12" height="9" rx="2" className={a} />
            </g>
          ))}
        </>
      )}
      {id === 'grande' && (
        <>
          <rect x="4" y="4" width="52" height="20" rx="2" className={a} />
          <rect x="4" y="28" width="30" height="3" rx="1.5" className={b} />
          <rect x="4" y="34" width="18" height="3" rx="1.5" className={a} />
        </>
      )}
      {id === 'carrusel' && (
        <>
          <rect x="4" y="5" width="22" height="24" rx="2" className={a} />
          <rect x="30" y="5" width="22" height="24" rx="2" className={a} />
          <rect x="56" y="5" width="22" height="24" rx="2" className={a} />
          <rect x="4" y="33" width="16" height="3" rx="1.5" className={b} />
          <rect x="30" y="33" width="16" height="3" rx="1.5" className={b} />
        </>
      )}
      {id === 'texto' && (
        <>
          {[6, 17, 28].map((y) => (
            <g key={y}>
              <rect x="4" y={y} width="34" height="3" rx="1.5" className={a} />
              <rect x="4" y={y + 5} width="22" height="2" rx="1" className={b} />
              <rect x="44" y={y} width="12" height="3" rx="1.5" className={a} />
            </g>
          ))}
        </>
      )}
    </svg>
  )
}

export default function ThemePage() {
  const { restaurant, canWrite, limits, reload: reloadCtx } = useRestaurant()
  const toast = useToast()
  const { data, loading, error, reload } = useData(async () => {
    const id = restaurant.id
    const [theme, categories, products, promotions, branches] = await Promise.all([
      unwrap<Theme | null>(supabase.from('restaurant_themes').select('*').eq('restaurant_id', id).maybeSingle()),
      unwrap<Category[]>(supabase.from('categories').select('*').eq('restaurant_id', id).eq('is_visible', true).order('sort_order')),
      unwrap<Product[]>(supabase.from('products').select('*').eq('restaurant_id', id).eq('is_published', true).order('sort_order')),
      unwrap<Promotion[]>(supabase.from('promotions').select('*').eq('restaurant_id', id).eq('is_active', true)),
      unwrap<Branch[]>(supabase.from('branches').select('*').eq('restaurant_id', id).eq('is_active', true)),
    ])
    return { theme: { ...DEFAULT_THEME, ...(theme ?? {}) } as Theme, categories, products, promotions, branches }
  }, [restaurant.id])

  if (loading && !data) return <PageLoader />
  if (error && !data) return <ErrorBox message={error ?? 'Error'} onRetry={reload} />
  if (!data) return null
  return (
    <Editor
      key={restaurant.id}
      data={data}
      canWrite={canWrite}
      advanced={limits.advanced_theme}
      onSaved={() => {
        reload()
        reloadCtx()
        toast('Apariencia guardada')
      }}
    />
  )
}

function Editor({ data, canWrite, advanced, onSaved }: {
  data: { theme: Theme; categories: Category[]; products: Product[]; promotions: Promotion[]; branches: Branch[] }
  canWrite: boolean; advanced: boolean; onSaved: () => void
}) {
  const { restaurant, setHasUnsavedChanges } = useRestaurant()
  const toast = useToast()

  const [savedTheme, setSavedTheme] = useState<Theme>(data.theme)
  const [savedLogo, setSavedLogo] = useState(restaurant.logo_url)
  const [savedCover, setSavedCover] = useState(restaurant.cover_url)

  const [theme, setTheme] = useState<Theme>(data.theme)
  const [logo, setLogo] = useState(restaurant.logo_url)
  const [cover, setCover] = useState(restaurant.cover_url)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Theme>(k: K, v: Theme[K]) => setTheme((t) => ({ ...t, [k]: v }))
  const lock = !canWrite || !advanced

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(theme) !== JSON.stringify(savedTheme) ||
      (logo ?? '') !== (savedLogo ?? '') ||
      (cover ?? '') !== (savedCover ?? '')
    )
  }, [theme, savedTheme, logo, savedLogo, cover, savedCover])

  useEffect(() => {
    setHasUnsavedChanges?.(isDirty)
    return () => setHasUnsavedChanges?.(false)
  }, [isDirty, setHasUnsavedChanges])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  function discardChanges() {
    setTheme(savedTheme)
    setLogo(savedLogo)
    setCover(savedCover)
    setHasUnsavedChanges?.(false)
    toast('Cambios descartados')
  }

  const t = todayLima()
  const preview: PublicMenuData = useMemo(() => ({
    restaurant: { ...restaurant, logo_url: logo, cover_url: cover },
    theme,
    branches: data.branches,
    categories: data.categories,
    products: data.products,
    promotions: data.promotions.filter((p) => (!p.starts_at || p.starts_at <= t) && (!p.ends_at || p.ends_at >= t)),
  }), [restaurant, logo, cover, theme, data, t])

  async function save() {
    for (const k of ['primary_color', 'secondary_color', 'button_color', 'bg_color'] as const)
      if (!HEX.test(theme[k])) return toast('Los colores deben tener formato #RRGGBB', 'error')
    setBusy(true)
    try {
      await unwrap(supabase.from('restaurants').update({ logo_url: logo, cover_url: cover }).eq('id', restaurant.id))
      const { restaurant_id: _r, ...fields } = theme
      await unwrap(supabase.from('restaurant_themes').update(fields).eq('restaurant_id', restaurant.id))
      setSavedTheme(theme)
      setSavedLogo(logo)
      setSavedCover(cover)
      setHasUnsavedChanges?.(false)
      onSaved()
    } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  const optBtn = (active: boolean) =>
    `overflow-hidden rounded-xl border text-center text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 hover:border-slate-300'}`

  return (
    <div>
      <PageHeader
        title="Apariencia"
        subtitle={isDirty
          ? 'Tienes cambios sin guardar. Baja hasta Fondo del menú para guardarlos.'
          : 'Personaliza tu menú. La vista previa se actualiza al instante; nada se publica hasta que guardes.'}
        actions={
          isDirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Sin guardar
            </span>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="space-y-4">
            <h2 className="font-semibold">Identidad</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageUpload restaurantId={restaurant.id} folder="logo" label="Logotipo" round maxSide={512} value={logo} onChange={setLogo} disabled={!canWrite} />
              <ImageUpload restaurantId={restaurant.id} folder="cover" label="Imagen de portada" maxSide={1600} value={cover} onChange={setCover} disabled={!canWrite} />
            </div>
            <ColorField label="Color principal" value={theme.primary_color} onChange={(v) => set('primary_color', v)} disabled={!canWrite} />
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="font-semibold">Estilo avanzado</h2>
              {!advanced && <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Disponible en el plan Profesional o superior.</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Color secundario" value={theme.secondary_color} onChange={(v) => set('secondary_color', v)} disabled={lock} />
              <ColorField label="Color de botones" value={theme.button_color} onChange={(v) => set('button_color', v)} disabled={lock} />
              <Field label="Plantilla">
                <Select value={theme.template} disabled={lock} onChange={(e) => set('template', e.target.value as Theme['template'])}>
                  {TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </Select>
              </Field>
              <Field label="Tipografía">
                <Select value={theme.font} disabled={lock} onChange={(e) => set('font', e.target.value as Theme['font'])}>
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label="Estilo de tarjetas">
                <Select value={theme.card_style} disabled={lock} onChange={(e) => set('card_style', e.target.value as Theme['card_style'])}>
                  {CARD_STYLES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </Select>
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium text-slate-700">Distribución de productos</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Distribución de productos">
                  {LAYOUTS.map((x) => (
                    <button key={x.id} type="button" role="radio" aria-checked={theme.layout === x.id} disabled={lock}
                      onClick={() => set('layout', x.id)} className={optBtn(theme.layout === x.id)}>
                      <LayoutThumb id={x.id} />
                      <span className="block bg-white px-1 py-1.5 text-slate-700">{x.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold">Fondo del menú</h3>
              <Field label="Tipo de fondo">
                <Select value={theme.bg_mode} disabled={lock} onChange={(e) => set('bg_mode', e.target.value as Theme['bg_mode'])}>
                  {BG_MODES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </Select>
              </Field>

              {theme.bg_mode === 'color' && (
                <ColorField label="Color de fondo" value={theme.bg_color} onChange={(v) => set('bg_color', v)} disabled={lock} />
              )}

              {theme.bg_mode === 'degradado' && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {GRADIENTS.map((g) => (
                    <button key={g.id} type="button" disabled={lock} onClick={() => set('bg_gradient', g.id)} className={optBtn(theme.bg_gradient === g.id)}>
                      <span className="block h-12" style={{ background: gradientCss(g) }} />
                      <span className="block bg-white py-1 text-slate-700">{g.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {theme.bg_mode === 'textura' && (
                <>
                  <ColorField label="Color base" value={theme.bg_color} onChange={(v) => set('bg_color', v)} disabled={lock} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TEXTURES.map((x) => (
                      <button key={x.id} type="button" disabled={lock} onClick={() => set('bg_texture', x.id)} className={optBtn(theme.bg_texture === x.id)}>
                        <span className="block h-12" style={{ backgroundColor: theme.bg_color, ...textureStyle(x.id, isDarkColor(theme.bg_color)) }} />
                        <span className="block bg-white py-1 text-slate-700">{x.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="text-xs text-slate-500">El texto cambia solo a claro u oscuro para que siempre se lea bien sobre tu fondo.</p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-500">
                  {isDirty ? (
                    <span className="font-medium text-amber-800">Tienes cambios pendientes por guardar.</span>
                  ) : (
                    <span>Todos los cambios están sincronizados.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={discardChanges}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  )}
                  <Button loading={busy} disabled={!canWrite} onClick={save}>Guardar cambios</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-sm font-medium text-slate-600">Vista previa</p>
          <div className="mx-auto h-[600px] w-full max-w-[340px] overflow-hidden rounded-[2rem] border-[8px] border-slate-900 bg-white shadow-2xl">
            <div className="h-full overflow-y-auto">
              <MenuView data={preview} slug={restaurant.slug} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}