import { useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import type { Plan, PlanLimits } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Toggle } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import Icon from '@/components/ui/Icon'

interface Form { id?: string; code: string; name: string; price: string; setup_fee: string; is_active: boolean; limits: PlanLimits }
const blankLimits: PlanLimits = { max_products: 30, max_branches: 1, advanced_theme: false, promotions: false, stats: false, branch_stats: false }
const lim = (n: number) => (n < 0 ? 'Ilimitados' : String(n))

export default function PlansPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useData(() => unwrap<Plan[]>(supabase.from('plans').select('*').order('price')), [])
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!form) return
    const price = Number(form.price.replace(',', '.')), setup = Number(form.setup_fee.replace(',', '.') || 0)
    if (!form.name.trim()) return setErr('Escribe el nombre del plan.')
    if (!form.id && !/^[a-z0-9_-]{2,30}$/.test(form.code)) return setErr('Código: minúsculas, números, - o _ (2 a 30).')
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(setup) || setup < 0) return setErr('Precios inválidos.')
    setBusy(true); setErr(null)
    try {
      const row = { name: form.name.trim(), price, setup_fee: setup, is_active: form.is_active, limits: form.limits }
      if (form.id) await unwrap(supabase.from('plans').update(row).eq('id', form.id))
      else await unwrap(supabase.from('plans').insert({ ...row, code: form.code }))
      toast('Plan guardado'); setForm(null); reload()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  const setL = <K extends keyof PlanLimits>(k: K, v: PlanLimits[K]) => setForm((f) => f && { ...f, limits: { ...f.limits, [k]: v } })

  return (
    <div>
      <PageHeader title="Planes" subtitle="Los límites y funciones se controlan desde aquí: no están escritos en el código."
        actions={<Button onClick={() => { setErr(null); setForm({ code: '', name: '', price: '0', setup_fee: '0', is_active: true, limits: { ...blankLimits } }) }}><Icon name="plus" className="h-4 w-4" /> Nuevo plan</Button>} />
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      <div className="grid gap-4 md:grid-cols-3">
        {data?.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{p.name}</h2>{!p.is_active && <Pill tone="amber">Inactivo</Pill>}</div>
            <p className="mt-1 text-2xl font-bold text-brand-700">S/ {Number(p.price).toFixed(2)}<span className="text-sm font-normal text-slate-500"> /mes</span></p>
            <p className="text-xs text-slate-500">Configuración: S/ {Number(p.setup_fee).toFixed(2)}</p>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600">
              <li>Productos: <strong>{lim(p.limits.max_products)}</strong></li>
              <li>Sucursales: <strong>{lim(p.limits.max_branches)}</strong></li>
              <li>{p.limits.advanced_theme ? '✓' : '✗'} Personalización avanzada</li>
              <li>{p.limits.promotions ? '✓' : '✗'} Promociones</li>
              <li>{p.limits.stats ? '✓' : '✗'} Estadísticas</li>
              <li>{p.limits.branch_stats ? '✓' : '✗'} Estadísticas por sucursal</li>
            </ul>
            <Button className="mt-4" variant="secondary" onClick={() => { setErr(null); setForm({ id: p.id, code: p.code, name: p.name, price: String(p.price), setup_fee: String(p.setup_fee), is_active: p.is_active, limits: { ...blankLimits, ...p.limits } }) }}>Editar</Button>
          </Card>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar plan' : 'Nuevo plan'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar</Button></>}>
        {form && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Código" hint="No se puede cambiar después"><Input value={form.code} disabled={!!form.id} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} /></Field>
            <Field label="Mensualidad (S/)"><Input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Tarifa de configuración (S/)"><Input inputMode="decimal" value={form.setup_fee} onChange={(e) => setForm({ ...form, setup_fee: e.target.value })} /></Field>
            <Field label="Máx. productos" hint="-1 = ilimitados"><Input type="number" min={-1} value={form.limits.max_products} onChange={(e) => setL('max_products', Number(e.target.value))} /></Field>
            <Field label="Máx. sucursales" hint="-1 = ilimitadas"><Input type="number" min={-1} value={form.limits.max_branches} onChange={(e) => setL('max_branches', Number(e.target.value))} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={form.limits.advanced_theme} onChange={(v) => setL('advanced_theme', v)} label="Personalización avanzada" />
            <Toggle checked={form.limits.promotions} onChange={(v) => setL('promotions', v)} label="Promociones" />
            <Toggle checked={form.limits.stats} onChange={(v) => setL('stats', v)} label="Estadísticas" />
            <Toggle checked={form.limits.branch_stats} onChange={(v) => setL('branch_stats', v)} label="Estadísticas por sucursal" />
            <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Plan activo (asignable)" />
          </div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        </>}
      </Modal>
    </div>
  )
}
