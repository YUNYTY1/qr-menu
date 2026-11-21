import { useMemo, useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { money } from '@/lib/format'
import { parsePrice } from '@/lib/validators'
import { useData } from '@/hooks/useData'
import type { Category, Product } from '@/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import Icon from '@/components/ui/Icon'
import { Link } from 'react-router-dom'
import { useRestaurant } from './RestaurantContext'

interface Form { id?: string; name: string; description: string; price: string; category_id: string; image_url: string | null; is_available: boolean; is_published: boolean }

export default function ProductsPage() {
  const { restaurant, canWrite, limits } = useRestaurant()
  const toast = useToast()
  const { data, loading, error, reload } = useData(async () => {
    const [categories, products] = await Promise.all([
      unwrap<Category[]>(supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order')),
      unwrap<Product[]>(supabase.from('products').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at')),
    ])
    return { categories, products }
  }, [restaurant.id])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [del, setDel] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const catName = useMemo(() => new Map((data?.categories ?? []).map((c) => [c.id, c.name])), [data])
  const filtered = (data?.products ?? []).filter((p) =>
    (!cat || p.category_id === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())))
  const total = data?.products.length ?? 0
  const max = limits.max_products
  const reached = max >= 0 && total >= max

  function openNew() {
    setErr(null)
    setForm({ name: '', description: '', price: '', category_id: cat || data?.categories[0]?.id || '', image_url: null, is_available: true, is_published: true })
  }

  async function save() {
    if (!form) return
    const price = parsePrice(form.price)
    if (!form.name.trim()) return setErr('Escribe el nombre del producto.')
    if (price === null) return setErr('El precio no es válido.')
    if (!form.category_id) return setErr('Selecciona una categoría. Si no tienes, crea una primero.')
    setBusy(true); setErr(null)
    try {
      const row = { name: form.name.trim(), description: form.description.trim() || null, price, category_id: form.category_id, image_url: form.image_url, is_available: form.is_available, is_published: form.is_published }
      if (form.id) await unwrap(supabase.from('products').update(row).eq('id', form.id))
      else await unwrap(supabase.from('products').insert({ ...row, restaurant_id: restaurant.id }))
      toast('Producto guardado'); setForm(null); reload()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  async function patch(p: Product, change: Partial<Product>, msg: string) {
    try { await unwrap(supabase.from('products').update(change).eq('id', p.id)); toast(msg); reload() }
    catch (e) { toast(errMsg(e), 'error') }
  }

  async function duplicate(p: Product) {
    try {
      await unwrap(supabase.from('products').insert({
        restaurant_id: restaurant.id, category_id: p.category_id, name: `${p.name} (copia)`.slice(0, 120), description: p.description,
        price: p.price, image_url: p.image_url, is_available: p.is_available, is_published: false,
      }))
      toast('Producto duplicado (queda oculto hasta que lo publiques)'); reload()
    } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <div>
      <PageHeader title="Productos"
        subtitle={`${total} de ${max < 0 ? 'ilimitados' : max} productos en tu plan`}
        actions={<Button disabled={!canWrite || reached} onClick={openNew}><Icon name="plus" className="h-4 w-4" /> Nuevo producto</Button>} />
      {reached && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Llegaste al límite de productos de tu plan. Contacta a Grupo Underty para ampliarlo.</p>}
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.categories.length === 0 && (
        <EmptyState title="Primero crea una categoría" hint="Los productos se organizan dentro de categorías."
          action={<Link to={`/panel/${restaurant.id}/categories`} className="text-sm font-semibold text-brand-700 hover:underline">Ir a categorías</Link>} />
      )}
      {data && data.categories.length > 0 && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
            <Input placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          {filtered.length === 0 && <EmptyState title="Sin productos" hint="Agrega tu primer producto o ajusta los filtros." />}
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((p) => (
              <Card key={p.id} className="flex gap-3 !p-3">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                  {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon name="image" className="h-8 w-8" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-slate-500">{catName.get(p.category_id)}</p>
                  <p className="mt-0.5 text-sm font-bold text-brand-700">{money(restaurant.currency, p.price)}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!p.is_available && <Pill tone="red">Agotado</Pill>}
                    {!p.is_published && <Pill tone="amber">Oculto</Pill>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-1">
                    <IconButton label="Editar" disabled={!canWrite} onClick={() => { setErr(null); setForm({ id: p.id, name: p.name, description: p.description ?? '', price: String(p.price), category_id: p.category_id, image_url: p.image_url, is_available: p.is_available, is_published: p.is_published }) }}><Icon name="edit" className="h-4 w-4" /></IconButton>
                    <IconButton label="Duplicar" disabled={!canWrite || reached} onClick={() => duplicate(p)}><Icon name="copy" className="h-4 w-4" /></IconButton>
                    <IconButton label={p.is_published ? 'Ocultar temporalmente' : 'Publicar'} disabled={!canWrite} onClick={() => patch(p, { is_published: !p.is_published }, p.is_published ? 'Producto oculto' : 'Producto publicado')}><Icon name={p.is_published ? 'eye' : 'eyeoff'} className="h-4 w-4" /></IconButton>
                    <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => patch(p, { is_available: !p.is_available }, p.is_available ? 'Marcado como agotado' : 'Disponible nuevamente')}>{p.is_available ? 'Marcar agotado' : 'Disponible'}</Button>
                    <IconButton label="Eliminar" disabled={!canWrite} onClick={() => setDel(p)} className="ml-auto"><Icon name="trash" className="h-4 w-4" /></IconButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar producto' : 'Nuevo producto'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar</Button></>}>
        {form && <>
          <Field label="Nombre"><Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Precio (${restaurant.currency})`}><Input value={form.price} inputMode="decimal" placeholder="0.00" onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Categoría">
              <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Selecciona…</option>
                {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Descripción" hint={`${form.description.length}/600`}><Textarea value={form.description} maxLength={600} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <ImageUpload restaurantId={restaurant.id} folder="products" label="Fotografía" value={form.image_url} onChange={(u) => setForm({ ...form, image_url: u })} />
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Toggle checked={form.is_available} onChange={(v) => setForm({ ...form, is_available: v })} label="Disponible (si no, aparece “Agotado”)" />
            <Toggle checked={form.is_published} onChange={(v) => setForm({ ...form, is_published: v })} label="Publicado en el menú" />
          </div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        </>}
      </Modal>
      <ConfirmDialog open={!!del} title="Eliminar producto" message={`¿Eliminar “${del?.name}”? Esta acción no se puede deshacer.`} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await unwrap(supabase.from('products').delete().eq('id', del!.id)); toast('Producto eliminado'); reload() } catch (e) { toast(errMsg(e), 'error') } setDel(null) }} />
    </div>
  )
}
