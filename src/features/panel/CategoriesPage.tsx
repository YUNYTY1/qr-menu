import { useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import type { Category } from '@/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import Icon from '@/components/ui/Icon'
import { useRestaurant } from './RestaurantContext'

interface Form { id?: string; name: string; image_url: string | null; is_visible: boolean }

export default function CategoriesPage() {
  const { restaurant, canWrite } = useRestaurant()
  const toast = useToast()
  const { data, loading, error, reload } = useData(
    () => unwrap<Category[]>(supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at')),
    [restaurant.id])
  const [form, setForm] = useState<Form | null>(null)
  const [del, setDel] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!form) return
    if (!form.name.trim()) return setErr('Escribe el nombre de la categoría.')
    setBusy(true); setErr(null)
    try {
      const row = { name: form.name.trim(), image_url: form.image_url, is_visible: form.is_visible }
      if (form.id) await unwrap(supabase.from('categories').update(row).eq('id', form.id))
      else {
        const next = (data ?? []).reduce((m, c) => Math.max(m, c.sort_order), -1) + 1
        await unwrap(supabase.from('categories').insert({ ...row, restaurant_id: restaurant.id, sort_order: next }))
      }
      toast('Categoría guardada'); setForm(null); reload()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  async function move(i: number, dir: -1 | 1) {
    const list = [...(data ?? [])]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    try {
      await Promise.all(list.map((c, idx) => (c.sort_order === idx ? null : unwrap(supabase.from('categories').update({ sort_order: idx }).eq('id', c.id)))))
      reload()
    } catch (e) { toast(errMsg(e), 'error') }
  }

  async function toggleVisible(c: Category) {
    try { await unwrap(supabase.from('categories').update({ is_visible: !c.is_visible }).eq('id', c.id)); reload() }
    catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <div>
      <PageHeader title="Categorías" subtitle="Organiza tu carta. El orden aquí es el orden del menú."
        actions={<Button disabled={!canWrite} onClick={() => { setErr(null); setForm({ name: '', image_url: null, is_visible: true }) }}><Icon name="plus" className="h-4 w-4" /> Nueva categoría</Button>} />
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="Aún no tienes categorías" hint="Ejemplos: Pollos a la brasa, Bebidas, Postres." />}
      {data && data.length > 0 && (
        <Card className="divide-y divide-slate-100 !p-0">
          {data.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <Icon name="category" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                {!c.is_visible && <Pill tone="amber">Oculta</Pill>}
              </div>
              <IconButton label="Subir" disabled={!canWrite || i === 0} onClick={() => move(i, -1)}><Icon name="up" /></IconButton>
              <IconButton label="Bajar" disabled={!canWrite || i === data.length - 1} onClick={() => move(i, 1)}><Icon name="down" /></IconButton>
              <IconButton label={c.is_visible ? 'Ocultar' : 'Mostrar'} disabled={!canWrite} onClick={() => toggleVisible(c)}><Icon name={c.is_visible ? 'eye' : 'eyeoff'} /></IconButton>
              <IconButton label="Editar" disabled={!canWrite} onClick={() => { setErr(null); setForm({ id: c.id, name: c.name, image_url: c.image_url, is_visible: c.is_visible }) }}><Icon name="edit" /></IconButton>
              <IconButton label="Eliminar" disabled={!canWrite} onClick={() => setDel(c)}><Icon name="trash" /></IconButton>
            </div>
          ))}
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar categoría' : 'Nueva categoría'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar</Button></>}>
        {form && <>
          <Field label="Nombre"><Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <ImageUpload restaurantId={restaurant.id} folder="categories" label="Imagen (opcional)" maxSide={800} value={form.image_url} onChange={(u) => setForm({ ...form, image_url: u })} />
          <Toggle checked={form.is_visible} onChange={(v) => setForm({ ...form, is_visible: v })} label="Visible en el menú" />
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        </>}
      </Modal>
      <ConfirmDialog open={!!del} title="Eliminar categoría" message={`¿Eliminar “${del?.name}”? Si tiene productos, primero muévelos o elimínalos.`}
        onCancel={() => setDel(null)}
        onConfirm={async () => { try { await unwrap(supabase.from('categories').delete().eq('id', del!.id)); toast('Categoría eliminada'); reload() } catch (e) { toast(errMsg(e), 'error') } setDel(null) }} />
    </div>
  )
}
