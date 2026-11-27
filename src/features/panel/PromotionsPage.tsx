import { useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { fmtDate } from '@/lib/format'
import { useData } from '@/hooks/useData'
import type { Promotion } from '@/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import Icon from '@/components/ui/Icon'
import PlanGate from './PlanGate'
import { useRestaurant } from './RestaurantContext'

interface Form { id?: string; title: string; image_url: string | null; starts_at: string; ends_at: string; is_active: boolean }
const blank: Form = { title: '', image_url: null, starts_at: '', ends_at: '', is_active: true }

export default function PromotionsPage() {
  const { restaurant, canWrite, limits } = useRestaurant()
  return (
    <div>
      <PageHeader title="Promociones" subtitle="Sube tus banners promocionales. Aparecen en carrusel arriba de tu carta y se amplían al tocarlos." />
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
    if (!form.image_url) return setErr('Sube una imagen para la promoción.')
    if (!form.title.trim()) return setErr('Escribe un nombre interno para identificarla.')
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) return setErr('La fecha final no puede ser anterior a la inicial.')
    setBusy(true); setErr(null)
    try {
      const row = {
        title: form.title.trim(),
        description: null,
        price: null,
        image_url: form.image_url,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active,
      }
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
      {data && data.length === 0 && <EmptyState title="Sin promociones" hint="Sube una imagen o banner promocional para mostrarlo arriba de tu carta." />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((p) => (
          <Card key={p.id} className="flex gap-3 !p-3">
            <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
              {p.image_url ? <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" /> : <Icon name="promo" className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.title}</p>
              <p className="text-xs text-slate-500">{p.starts_at || p.ends_at ? `${fmtDate(p.starts_at)} → ${fmtDate(p.ends_at)}` : 'Sin fechas'}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {p.is_active ? <Pill tone="green">Activa</Pill> : <Pill>Pausada</Pill>}
                {!p.image_url && <Pill tone="amber">Sin imagen</Pill>}
              </div>
            </div>
            <div className="flex flex-col">
              <IconButton label="Editar" disabled={!canWrite} onClick={() => { setErr(null); setForm({ id: p.id, title: p.title, image_url: p.image_url, starts_at: p.starts_at ?? '', ends_at: p.ends_at ?? '', is_active: p.is_active }) }}><Icon name="edit" className="h-4 w-4" /></IconButton>
              <IconButton label="Eliminar" disabled={!canWrite} onClick={() => setDel(p)}><Icon name="trash" className="h-4 w-4" /></IconButton>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar promoción' : 'Nueva promoción'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar</Button></>}>
        {form && <>
          <ImageUpload restaurantId={rid} folder="promotions" label="Imagen de la promoción" maxSide={1200} value={form.image_url} onChange={(u) => setForm({ ...form, image_url: u })} />
          <Field label="Nombre interno" hint="Solo para identificarla aquí en tu panel; en la carta se verá únicamente la imagen.">
            <Input value={form.title} maxLength={120} placeholder="Ej.: Combo 2x1 makis" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
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