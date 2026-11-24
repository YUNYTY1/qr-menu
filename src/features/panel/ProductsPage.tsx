import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { money } from '@/lib/format'
import { parsePrice } from '@/lib/validators'
import { useData } from '@/hooks/useData'
import type { Branch, Category, Product } from '@/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import Icon from '@/components/ui/Icon'
import ImportMenuModal from './ImportMenuModal'
import { useRestaurant } from './RestaurantContext'

interface Form {
  id?: string
  name: string
  description: string
  price: string
  category_id: string
  image_url: string | null
  is_available: boolean
  is_published: boolean
  unavailable_branch_ids: string[]
}

export default function ProductsPage() {
  const { restaurant, canWrite, limits } = useRestaurant()
  const toast = useToast()
  const { data, loading, error, reload } = useData(async () => {
    const [categories, products, branches] = await Promise.all([
      unwrap<Category[]>(supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order')),
      unwrap<Product[]>(supabase.from('products').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at')),
      unwrap<Branch[]>(supabase.from('branches').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true).order('name')),
    ])
    return { categories, products, branches }
  }, [restaurant.id])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [del, setDel] = useState<Product | null>(null)
  const [importing, setImporting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [animId, setAnimId] = useState<string | null>(null)

  const catName = useMemo(() => new Map((data?.categories ?? []).map((c) => [c.id, c.name])), [data])
  const filtered = (data?.products ?? []).filter(
    (p) => (!cat || p.category_id === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  )
  const total = data?.products.length ?? 0
  const max = limits.max_products
  const reached = max >= 0 && total >= max
  const branches = data?.branches ?? []

  function triggerPulse(id: string) {
    setAnimId(id)
    setTimeout(() => setAnimId((curr) => (curr === id ? null : curr)), 450)
  }

  function openNew() {
    setErr(null)
    setForm({
      name: '',
      description: '',
      price: '',
      category_id: cat || data?.categories[0]?.id || '',
      image_url: null,
      is_available: true,
      is_published: true,
      unavailable_branch_ids: [],
    })
  }

  function openEdit(p: Product) {
    setErr(null)
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      category_id: p.category_id,
      image_url: p.image_url,
      is_available: p.is_available,
      is_published: p.is_published,
      unavailable_branch_ids: p.unavailable_branch_ids ?? [],
    })
  }

  function toggleBranchAvailability(branchId: string, checked: boolean) {
    if (!form) return
    setForm((prev) => {
      if (!prev) return prev
      const current = new Set(prev.unavailable_branch_ids)
      if (checked) {
        current.delete(branchId)
      } else {
        current.add(branchId)
      }
      return { ...prev, unavailable_branch_ids: Array.from(current) }
    })
  }

  async function save() {
    if (!form) return
    const price = parsePrice(form.price)
    if (!form.name.trim()) return setErr('Escribe el nombre del producto.')
    if (price === null) return setErr('El precio no es válido.')
    if (!form.category_id) return setErr('Selecciona una categoría. Si no tienes, crea una primero.')
    setBusy(true)
    setErr(null)
    try {
      const row = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        category_id: form.category_id,
        image_url: form.image_url,
        is_available: form.is_available,
        is_published: form.is_published,
        unavailable_branch_ids: form.unavailable_branch_ids,
      }
      if (form.id) {
        await unwrap(supabase.from('products').update(row).eq('id', form.id))
        triggerPulse(form.id)
      } else {
        const created = await unwrap<Product>(
          supabase.from('products').insert({ ...row, restaurant_id: restaurant.id }).select().single()
        )
        if (created?.id) triggerPulse(created.id)
      }
      toast('Producto guardado')
      setForm(null)
      reload()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function patch(p: Product, change: Partial<Product>, msg: string) {
    triggerPulse(p.id)
    try {
      await unwrap(supabase.from('products').update(change).eq('id', p.id))
      toast(msg)
      reload()
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  async function duplicate(p: Product) {
    try {
      const created = await unwrap<Product>(
        supabase
          .from('products')
          .insert({
            restaurant_id: restaurant.id,
            category_id: p.category_id,
            name: `${p.name} (copia)`.slice(0, 120),
            description: p.description,
            price: p.price,
            image_url: p.image_url,
            is_available: p.is_available,
            is_published: false,
            unavailable_branch_ids: p.unavailable_branch_ids ?? [],
          })
          .select()
          .single()
      )
      if (created?.id) triggerPulse(created.id)
      toast('Producto duplicado (queda oculto hasta que lo publiques)')
      reload()
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }

  return (
    <div className="pb-20 sm:pb-6">
      <PageHeader
        title="Productos"
        subtitle={`${total} de ${max < 0 ? 'ilimitados' : max} productos en tu carta`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              variant="secondary"
              disabled={!canWrite || reached}
              onClick={() => setImporting(true)}
              className="flex-1 justify-center rounded-xl sm:flex-initial"
            >
              ✨ Importar con IA
            </Button>
            <Button
              disabled={!canWrite || reached}
              onClick={openNew}
              className="flex-1 justify-center rounded-xl sm:flex-initial"
            >
              <Icon name="plus" className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>
        }
      />

      {reached && (
        <p className="anim-pop-in mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Llegaste al límite de productos de tu plan. Contacta a Grupo Underty para ampliarlo.
        </p>
      )}

      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && data.categories.length === 0 && (
        <EmptyState
          title="Primero crea una categoría"
          hint="Los productos se organizan dentro de categorías (ej. Pollos, Bebidas, Combos)."
          action={
            <Link
              to={`/panel/${restaurant.id}/categories`}
              className="inline-flex items-center rounded-xl bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-700 transition-all duration-150 hover:bg-orange-100 active:scale-95"
            >
              Ir a categorías →
            </Link>
          }
        />
      )}

      {data && data.categories.length > 0 && (
        <>
          <div className="anim-fade-in mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="grid gap-2.5 sm:grid-cols-[1fr_220px]">
              <Input
                placeholder="Buscar plato o bebida…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="!rounded-xl"
              />
              <Select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="!rounded-xl"
              >
                <option value="">Todas las categorías</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="no-scrollbar -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:hidden">
              <button
                type="button"
                onClick={() => setCat('')}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
                  cat === ''
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({data.products.length})
              </button>
              {data.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
                    cat === c.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              title="Sin productos"
              hint="Agrega tu primer producto o ajusta la búsqueda."
            />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((p) => {
              const unavailCount = p.unavailable_branch_ids?.length ?? 0
              return (
                <Card
                  key={p.id}
                  className={`anim-pop-in group flex gap-3.5 rounded-2xl border border-slate-200/80 !p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:scale-[0.99] ${
                    animId === p.id ? 'scale-[1.01] ring-2 ring-orange-400/70' : ''
                  } ${!p.is_published || !p.is_available ? 'bg-slate-50/70' : 'bg-white'}`}
                >
                  <button
                    type="button"
                    disabled={!canWrite}
                    onClick={() => openEdit(p)}
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/70 transition-all duration-150 group-hover:ring-orange-300 active:scale-95 disabled:cursor-default"
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Icon name="image" className="h-7 w-7" />
                    )}
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => openEdit(p)}
                          className="block max-w-full truncate text-left font-semibold text-slate-900 transition-colors hover:text-orange-600 disabled:cursor-default"
                        >
                          {p.name}
                        </button>
                        <p className="text-xs font-medium text-slate-500">
                          {catName.get(p.category_id)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-orange-50 px-2 py-0.5 text-sm font-bold text-orange-700 transition-transform duration-150 group-hover:scale-105">
                        {money(restaurant.currency, p.price)}
                      </span>
                    </div>

                    {(!p.is_available || !p.is_published || unavailCount > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {!p.is_available && <Pill tone="red">Agotado</Pill>}
                        {!p.is_published && <Pill tone="amber">Oculto</Pill>}
                        {unavailCount > 0 && (
                          <Pill tone="amber">
                            Agotado en {unavailCount} {unavailCount === 1 ? 'sucursal' : 'sucursales'}
                          </Pill>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-1 pt-2.5">
                      <Button
                        size="sm"
                        variant={p.is_available ? 'ghost' : 'secondary'}
                        disabled={!canWrite}
                        onClick={() =>
                          patch(
                            p,
                            { is_available: !p.is_available },
                            p.is_available ? 'Marcado como agotado' : 'Disponible nuevamente'
                          )
                        }
                        className="h-8 rounded-lg px-2.5 text-xs"
                      >
                        {p.is_available ? 'Marcar agotado' : 'Disponible'}
                      </Button>

                      <IconButton
                        label="Editar"
                        disabled={!canWrite}
                        onClick={() => openEdit(p)}
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </IconButton>

                      <IconButton
                        label="Duplicar"
                        disabled={!canWrite || reached}
                        onClick={() => duplicate(p)}
                      >
                        <Icon name="copy" className="h-4 w-4" />
                      </IconButton>

                      <IconButton
                        label={p.is_published ? 'Ocultar temporalmente' : 'Publicar'}
                        disabled={!canWrite}
                        onClick={() =>
                          patch(
                            p,
                            { is_published: !p.is_published },
                            p.is_published ? 'Producto oculto' : 'Producto publicado'
                          )
                        }
                      >
                        <Icon name={p.is_published ? 'eye' : 'eyeoff'} className="h-4 w-4" />
                      </IconButton>

                      <IconButton
                        label="Eliminar"
                        disabled={!canWrite}
                        onClick={() => setDel(p)}
                        className="ml-auto text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {canWrite && !reached && (
        <button
          type="button"
          onClick={openNew}
          aria-label="Nuevo producto"
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-600/35 transition-all duration-150 hover:scale-105 hover:from-orange-600 hover:to-orange-700 active:scale-90 sm:hidden"
        >
          <Icon name="plus" className="h-6 w-6" />
        </button>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar producto' : 'Nuevo producto'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button loading={busy} onClick={save} className="w-full sm:w-auto">
              Guardar producto
            </Button>
          </>
        }
      >
        {form && (
          <>
            <Field label="Nombre">
              <Input
                value={form.name}
                maxLength={120}
                placeholder="Ej. 1/4 de Pollo a la Brasa"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Precio (${restaurant.currency})`}>
                <Input
                  value={form.price}
                  inputMode="decimal"
                  placeholder="0.00"
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Categoría">
                <Select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">Selecciona…</option>
                  {data?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Descripción" hint={`${form.description.length}/600`}>
              <Textarea
                value={form.description}
                maxLength={600}
                placeholder="Incluye papas fritas, ensalada y cremas de la casa…"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <ImageUpload
              restaurantId={restaurant.id}
              folder="products"
              label="Fotografía"
              value={form.image_url}
              onChange={(u) => setForm({ ...form, image_url: u })}
            />
            <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-xl bg-slate-50 p-3.5">
              <Toggle
                checked={form.is_available}
                onChange={(v) => setForm({ ...form, is_available: v })}
                label="Disponible (si no, aparece “Agotado”)"
              />
              <Toggle
                checked={form.is_published}
                onChange={(v) => setForm({ ...form, is_published: v })}
                label="Publicado en el menú"
              />
            </div>

            {branches.length > 0 && (
              <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Disponible en sucursales
                </p>
                <p className="text-xs text-slate-500">
                  Desmarca una sucursal si este producto se agotó o no se vende ahí.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {branches.map((b) => {
                    const checked = !form.unavailable_branch_ids.includes(b.id)
                    return (
                      <label
                        key={b.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:border-orange-200"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleBranchAvailability(b.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="truncate font-medium">{b.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {err && (
              <p role="alert" className="anim-pop-in rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {err}
              </p>
            )}
          </>
        )}
      </Modal>

      {importing && (
        <ImportMenuModal
          restaurantId={restaurant.id}
          currency={restaurant.currency}
          existing={data?.categories ?? []}
          slots={max < 0 ? -1 : Math.max(0, max - total)}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false)
            reload()
          }}
        />
      )}

      <ConfirmDialog
        open={!!del}
        title="Eliminar producto"
        message={`¿Eliminar “${del?.name}”? Esta acción no se puede deshacer.`}
        onCancel={() => setDel(null)}
        onConfirm={async () => {
          try {
            await unwrap(supabase.from('products').delete().eq('id', del!.id))
            toast('Producto eliminado')
            reload()
          } catch (e) {
            toast(errMsg(e), 'error')
          }
          setDel(null)
        }}
      />
    </div>
  )
}