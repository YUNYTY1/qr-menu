import { useEffect, useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { effStatus, STATUS_LABEL } from '@/lib/status'
import { fmtDate, todayLima } from '@/lib/format'
import type { Payment, Plan, SubStatus, Subscription } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ErrorBox, PageLoader, useToast } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { ConfirmDialog } from '@/components/ui/Modal'

export default function SubscriptionTab({ restaurantId, onChanged }: { restaurantId: string; onChanged: () => void }) {
  const toast = useToast()
  const { data, loading, error, reload } = useData(async () => {
    const [sub, plans, payments] = await Promise.all([
      unwrap<Subscription>(supabase.from('subscriptions').select('*').eq('restaurant_id', restaurantId).single()),
      unwrap<Plan[]>(supabase.from('plans').select('*').order('price')),
      unwrap<Payment[]>(supabase.from('subscription_payments').select('*').eq('restaurant_id', restaurantId).order('paid_at', { ascending: false }).order('created_at', { ascending: false })),
    ])
    return { sub, plans, payments }
  }, [restaurantId])

  const [form, setForm] = useState({ plan_id: '', status: 'pendiente' as SubStatus, start_date: '', end_date: '', notes: '' })
  const [renew, setRenew] = useState({ months: '1', amount: '', method: '', note: '' })
  const [pay, setPay] = useState({ amount: '', type: 'configuracion', method: '', note: '', paid_at: todayLima() })
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | { status: SubStatus; title: string; msg: string }>(null)

  useEffect(() => {
    if (data) setForm({ plan_id: data.sub.plan_id, status: data.sub.status, start_date: data.sub.start_date ?? '', end_date: data.sub.end_date ?? '', notes: data.sub.notes ?? '' })
  }, [data])

  if (loading && !data) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? 'Error'} onRetry={reload} />
  const { sub, plans, payments } = data
  const eff = effStatus(sub)
  const plan = plans.find((p) => p.id === sub.plan_id)

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key)
    try { await fn(); toast(ok); reload(); onChanged() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }

  const saveSub = () => {
    if (form.start_date && form.end_date && form.end_date < form.start_date) return toast('La fecha de vencimiento no puede ser anterior al inicio.', 'error')
    return run('save', () => unwrap(supabase.from('subscriptions').update({
      plan_id: form.plan_id, status: form.status, start_date: form.start_date || null, end_date: form.end_date || null, notes: form.notes.trim() || null,
    }).eq('id', sub.id)), 'Suscripción actualizada')
  }
  const setStatus = (status: SubStatus) => run('status', () => unwrap(supabase.from('subscriptions').update({ status }).eq('id', sub.id)), `Estado: ${STATUS_LABEL[status]}`)

  const doRenew = () => {
    const months = Number(renew.months), amount = renew.amount ? Number(renew.amount.replace(',', '.')) : null
    if (!Number.isInteger(months) || months < 1 || months > 36) return toast('Meses inválidos (1 a 36).', 'error')
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return toast('Monto inválido.', 'error')
    return run('renew', () => unwrap(supabase.rpc('renew_subscription', { p_subscription: sub.id, p_months: months, p_amount: amount, p_method: renew.method || null, p_note: renew.note || null })), 'Suscripción renovada')
  }

  const addPay = () => {
    const amount = Number(pay.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) return toast('Ingresa un monto válido.', 'error')
    return run('pay', async () => {
      await unwrap(supabase.from('subscription_payments').insert({ subscription_id: sub.id, restaurant_id: restaurantId, amount, type: pay.type, method: pay.method || null, note: pay.note || null, paid_at: pay.paid_at }))
      setPay({ ...pay, amount: '', note: '' })
    }, 'Pago registrado')
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-slate-500">Estado actual</p>
          <div className="mt-1 flex items-center gap-2"><Badge status={eff} /><span className="text-sm text-slate-600">{plan?.name} · vence {fmtDate(sub.end_date)}</span></div>
          {eff !== sub.status && <p className="mt-1 text-xs text-red-600">La fecha de vencimiento ya pasó. Renueva para reactivar.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {(eff === 'suspendido' || eff === 'cancelado') && <Button size="sm" loading={busy === 'status'} onClick={() => setStatus('activo')}>Reactivar</Button>}
          {(eff === 'activo' || eff === 'pendiente' || eff === 'vencido') && (
            <Button size="sm" variant="danger" onClick={() => setConfirm({ status: 'suspendido', title: 'Suspender servicio', msg: 'El menú público mostrará “Servicio temporalmente no disponible” y el cliente quedará en solo lectura. Los datos NO se eliminan.' })}>Suspender</Button>
          )}
          {eff !== 'cancelado' && <Button size="sm" variant="secondary" onClick={() => setConfirm({ status: 'cancelado', title: 'Cancelar suscripción', msg: 'El menú dejará de mostrarse. Los datos se conservan y puedes reactivar cuando quieras.' })}>Cancelar</Button>}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Renovar suscripción</h2>
        <p className="text-xs text-slate-500">Extiende el vencimiento desde hoy (o desde la fecha actual si aún está vigente), la deja activa y registra el pago.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Meses"><Input type="number" min={1} max={36} value={renew.months} onChange={(e) => setRenew({ ...renew, months: e.target.value })} /></Field>
          <Field label="Monto (S/)"><Input inputMode="decimal" value={renew.amount} placeholder={plan ? String(plan.price) : ''} onChange={(e) => setRenew({ ...renew, amount: e.target.value })} /></Field>
          <Field label="Método"><Input value={renew.method} placeholder="Yape, transferencia…" onChange={(e) => setRenew({ ...renew, method: e.target.value })} /></Field>
          <Field label="Nota"><Input value={renew.note} onChange={(e) => setRenew({ ...renew, note: e.target.value })} /></Field>
        </div>
        <Button loading={busy === 'renew'} onClick={doRenew}>Renovar y registrar pago</Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Plan y fechas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan"><Select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Estado"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SubStatus })}>{(Object.keys(STATUS_LABEL) as SubStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select></Field>
          <Field label="Inicio"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="Vencimiento"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
        </div>
        <Field label="Notas internas"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Button loading={busy === 'save'} onClick={saveSub}>Guardar</Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Registrar pago</h2>
        <div className="grid gap-4 sm:grid-cols-5">
          <Field label="Monto (S/)"><Input inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          <Field label="Tipo"><Select value={pay.type} onChange={(e) => setPay({ ...pay, type: e.target.value })}><option value="configuracion">Configuración</option><option value="mensualidad">Mensualidad</option><option value="otro">Otro</option></Select></Field>
          <Field label="Fecha"><Input type="date" value={pay.paid_at} onChange={(e) => setPay({ ...pay, paid_at: e.target.value })} /></Field>
          <Field label="Método"><Input value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} /></Field>
          <Field label="Nota"><Input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
        </div>
        <Button variant="secondary" loading={busy === 'pay'} onClick={addPay}>Registrar pago</Button>
        <div className="overflow-x-auto">
          {payments.length === 0 ? <EmptyState title="Sin pagos registrados" /> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">Fecha</th><th>Tipo</th><th>Monto</th><th>Método</th><th>Nota</th></tr></thead>
              <tbody>{payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100"><td className="py-2">{fmtDate(p.paid_at)}</td><td className="capitalize">{p.type}</td><td className="font-semibold">S/ {Number(p.amount).toFixed(2)}</td><td>{p.method ?? '—'}</td><td className="text-slate-500">{p.note ?? ''}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </Card>

      <ConfirmDialog open={!!confirm} title={confirm?.title ?? ''} message={confirm?.msg ?? ''} confirmLabel="Confirmar" onCancel={() => setConfirm(null)}
        onConfirm={async () => { const s = confirm!.status; setConfirm(null); await setStatus(s) }} />
    </div>
  )
}
