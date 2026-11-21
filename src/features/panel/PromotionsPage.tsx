import { useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { fmtDate } from '@/lib/format'
import { useData } from '@/hooks/useData'
import type { Promotion } from '@/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Textarea, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import Icon from '@/components/ui/Icon'
import PlanGate from './PlanGate'
import { useRestaurant } from './RestaurantContext'

interface Form { id?: string; title: string; description: string; image_url: string | null; starts_at: string; ends_at: string; is_active: boolean }
const blank: Form = { title: '', description: '', image_url: null, starts_at: '', ends_at: '', is_active: true }

export default function PromotionsPage() {
  const { restaurant, canWrite, limits } = useRestaurant()
  return (
    <div>
      <PageHeader title="Promociones" subtitle="Banners que aparecen arriba de tu carta." />
      <PlanGate allowed={limits.promotions} feature="Las promociones"><Inner rid={restaurant.id} canWrite={canWrite} /></PlanGate>
    </div>
  )
}

function Inner({ rid, canWrite }: { rid: string; canWrite: boolean }) {
  const toast = useToast()
  const { data, loading, error, reload } = useData(
    () => unwrap<Promotion[]>(supabase.from('promotions').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false })), [rid])
  const [form, setForm] = useState<Form | null>(null)
  const [del, setDel] = useState<Promotion | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!form) return
    if (!form.title.trim()) return setErr('Escribe un título.')
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) return setErr('La fecha final no puede ser anterior a la inicial.')
    setBusy(true); setErr(null)
    try {
      const row = { title: form.title.trim(), description: form.description.trim() || null, image_url: form.image_url, starts_at: form.starts_at || null, ends_at: form.ends_at || null, is_active: form.is_active }
      if (form.id) await unwrap(supabase.from('promotions').update(row).eq('id', form.id))
      else await unwrap(supabase.from('promotions').insert({ ...row, restaurant_id: rid }))
      toast('Promoción guardada'); setForm(null); reload()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button disabled={!canWrite} onClick={() => { setErr(null); setForm({ ...blank }) }}><Icon name="plus" className="h-4 w-4" /> Nueva promoción</Button></div>
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="Sin promociones" hint="Ejemplo: “2x1 en alitas los martes”." />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((p) => (
          <Card key={p.id} className="flex gap-3 !p-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
              {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Icon name="promo" className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.title}</p>
              <p className="text-xs text-slate-500">{p.starts_at || p.ends_at ? `${fmtDate(p.starts_at)} → ${fmtDate(p.ends_at)}` : 'Sin fechas'}</p>
              <div className="mt-1">{p.is_active ? <Pill tone="green">Activa</Pill> : <Pill>Pausada</Pill>}</div>
            </div>
            <div className="flex flex-col">
              <IconButton label="Editar" disabled={!canWrite} onClick={() => { setErr(null); setForm({ id: p.id, title: p.title, description: p.description ?? '', image_url: p.image_url, starts_at: p.starts_at ?? '', ends_at: p.ends_at ?? '', is_active: p.is_active }) }}><Icon name="edit" className="h-4 w-4" /></IconButton>
              <IconButton label="Eliminar" disabled={!canWrite} onClick={() => setDel(p)}><Icon name="trash" className="h-4 w-4" /></IconButton>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar promoción' : 'Nueva promoción'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar</Button></>}>
        {form && <>
          <Field label="Título"><Input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
          <Field label="Descripción"><Textarea value={form.description} maxLength={400} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <ImageUpload restaurantId={rid} folder="promotions" label="Imagen (opcional)" maxSide={1000} value={form.image_url} onChange={(u) => setForm({ ...form, image_url: u })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde (opcional)"><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
            <Field label="Hasta (opcional)"><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
          </div>
          <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Promoción activa" />
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        </>}
      </Modal>
      <ConfirmDialog open={!!del} title="Eliminar promoción" message={`¿Eliminar “${del?.title}”?`} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await unwrap(supabase.from('promotions').delete().eq('id', del!.id)); toast('Promoción eliminada'); reload() } catch (e) { toast(errMsg(e), 'error') } setDel(null) }} />
    </>
  )
}
