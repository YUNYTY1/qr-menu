import { useMemo, useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { CARD_STYLES, DEFAULT_THEME, FONTS, LAYOUTS, TEMPLATES } from '@/lib/theme'
import { todayLima } from '@/lib/format'
import type { Branch, Category, Product, Promotion, PublicMenuData, Theme } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, ErrorBox, PageHeader, PageLoader, useToast } from '@/components/ui/Feedback'
import { ColorField, Field, Select } from '@/components/ui/Form'
import ImageUpload from '@/components/ui/ImageUpload'
import MenuView from '@/features/public-menu/MenuView'
import { useRestaurant } from './RestaurantContext'

const HEX = /^#[0-9a-fA-F]{6}$/

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

  if (loading) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? 'Error'} onRetry={reload} />
  return <Editor key={restaurant.id} data={data} canWrite={canWrite} advanced={limits.advanced_theme}
    onSaved={() => { reload(); reloadCtx(); toast('Apariencia guardada') }} />
}

function Editor({ data, canWrite, advanced, onSaved }: {
  data: { theme: Theme; categories: Category[]; products: Product[]; promotions: Promotion[]; branches: Branch[] }
  canWrite: boolean; advanced: boolean; onSaved: () => void
}) {
  const { restaurant } = useRestaurant()
  const toast = useToast()
  const [theme, setTheme] = useState<Theme>(data.theme)
  const [logo, setLogo] = useState(restaurant.logo_url)
  const [cover, setCover] = useState(restaurant.cover_url)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Theme>(k: K, v: Theme[K]) => setTheme((t) => ({ ...t, [k]: v }))
  const lock = !canWrite || !advanced

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
    for (const k of ['primary_color', 'secondary_color', 'button_color'] as const)
      if (!HEX.test(theme[k])) return toast('Los colores deben tener formato #RRGGBB', 'error')
    setBusy(true)
    try {
      await unwrap(supabase.from('restaurants').update({ logo_url: logo, cover_url: cover }).eq('id', restaurant.id))
      const { restaurant_id: _r, ...fields } = theme
      await unwrap(supabase.from('restaurant_themes').update(fields).eq('restaurant_id', restaurant.id))
      onSaved()
    } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Apariencia" subtitle="Personaliza tu menú. La vista previa se actualiza al instante; nada se publica hasta que guardes."
        actions={<Button loading={busy} disabled={!canWrite} onClick={save}>Guardar cambios</Button>} />
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

          <Card className="space-y-4">
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
              <Field label="Distribución de productos">
                <Select value={theme.layout} disabled={lock} onChange={(e) => set('layout', e.target.value as Theme['layout'])}>
                  {LAYOUTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </Select>
              </Field>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-sm font-medium text-slate-600">Vista previa</p>
          <div className="mx-auto h-[640px] w-[320px] overflow-hidden rounded-[2.2rem] border-[10px] border-slate-900 bg-white shadow-2xl">
            <div className="h-full overflow-y-auto">
              <MenuView data={preview} slug={restaurant.slug} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
