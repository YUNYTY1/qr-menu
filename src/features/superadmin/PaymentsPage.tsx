import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { proofUrl } from '@/lib/proofs'
import { fmtDate, money } from '@/lib/format'
import { monthsLabel, type BillingSettings, type PaymentOrder } from '@/types/billing'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Textarea, Toggle } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'

export default function PaymentsPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useData(async () => {
    const sel = '*, restaurants(name,slug), plans(name)'
    const [pending, history, settings] = await Promise.all([
      unwrap<PaymentOrder[]>(supabase.from('payment_orders').select(sel).eq('status', 'pending').eq('provider', 'manual').order('created_at')),
      unwrap<PaymentOrder[]>(supabase.from('payment_orders').select(sel).neq('status', 'pending').order('created_at', { ascending: false }).limit(15)),
      unwrap<BillingSettings>(supabase.from('billing_settings').select('*').eq('id', 1).single()),
    ])
    const urls: Record<string, string | null> = {}
    await Promise.all(pending.map(async (o) => { urls[o.id] = o.proof_path ? await proofUrl(o.proof_path) : null }))
    return { pending, history, settings, urls }
  }, [])

  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<PaymentOrder | null>(null)
  const [reason, setReason] = useState('')
  const [zoom, setZoom] = useState<string | null>(null)

  async function approve(o: PaymentOrder) {
    setBusy(o.id)
    try { await unwrap(supabase.rpc('approve_payment_order', { p_order: o.id })); toast('Pago aprobado: plan activado'); reload() }
    catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }
  async function reject() {
    if (!rejecting) return
    setBusy(rejecting.id)
    try { await unwrap(supabase.rpc('reject_payment_order', { p_order: rejecting.id, p_note: reason || null })); toast('Pago rechazado'); setRejecting(null); setReason(''); reload() }
    catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Pagos" subtitle="Confirma los comprobantes de Yape/transferencia y configura cómo cobras." />
      {loading && !data && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Por confirmar ({data.pending.length})</h2>
            {data.pending.length === 0 && <EmptyState title="No hay pagos por confirmar" hint="Cuando un cliente suba un comprobante aparecerá aquí." />}
            <div className="grid gap-4 md:grid-cols-2">
              {data.pending.map((o) => (
                <Card key={o.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/superadmin/restaurants/${o.restaurant_id}`} className="font-semibold text-brand-700 hover:underline">{o.restaurants?.name}</Link>
                      <p className="text-xs text-slate-500">{fmtDate(o.created_at)} · Plan {o.plans?.name} · {monthsLabel(o.months)}</p>
                    </div>
                    <p className="text-xl font-extrabold">{money('S/', Number(o.amount))}</p>
                  </div>
                  {data.urls[o.id]
                    ? <button onClick={() => setZoom(data.urls[o.id])} className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={data.urls[o.id]!} alt="Comprobante" className="max-h-56 w-full object-contain" /></button>
                    : <p className="text-sm text-red-600">No se pudo cargar el comprobante.</p>}
                  {o.note && <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-600">“{o.note}”</p>}
                  <p className="text-xs text-slate-500">Verifica en tu Yape/banco que llegaron exactamente {money('S/', Number(o.amount))} antes de aprobar.</p>
                  <div className="flex gap-2">
                    <Button loading={busy === o.id} onClick={() => approve(o)}>Aprobar y activar</Button>
                    <Button variant="secondary" disabled={busy === o.id} onClick={() => { setRejecting(o); setReason('') }}>Rechazar</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Historial reciente</h2>
            <Card className="!p-0">
              {data.history.length === 0 ? <p className="p-5 text-sm text-slate-500">Sin movimientos.</p> : (
                <div className="divide-y divide-slate-100">
                  {data.history.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <span><strong>{o.restaurants?.name}</strong> · {o.plans?.name} · {monthsLabel(o.months)} · {o.provider === 'mercadopago' ? 'Tarjeta' : 'Manual'}<span className="ml-2 text-xs text-slate-400">{fmtDate(o.created_at)}</span></span>
                      <span className="flex items-center gap-3"><strong>{money('S/', Number(o.amount))}</strong>
                        <Pill tone={o.status === 'paid' ? 'green' : o.status === 'rejected' ? 'red' : 'slate'}>{{ paid: 'Pagado', rejected: 'Rechazado', cancelled: 'Cancelado', pending: 'Pendiente' }[o.status]}</Pill></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <SettingsForm initial={data.settings} onSaved={reload} />
        </>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Rechazar pago"
        footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancelar</Button><Button variant="danger" loading={busy === rejecting?.id} onClick={reject}>Rechazar</Button></>}>
        <Field label="Motivo (lo verá el cliente)"><Textarea value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: el monto no coincide con lo recibido" /></Field>
      </Modal>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Comprobante" size="lg">
        {zoom && <img src={zoom} alt="Comprobante" className="mx-auto max-h-[70vh] object-contain" />}
      </Modal>
    </div>
  )
}

function SettingsForm({ initial, onSaved }: { initial: BillingSettings; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => setF(initial), [initial])
  const set = (k: keyof BillingSettings) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function save() {
    const trial = Number(f.trial_days)
    if (!Number.isInteger(trial) || trial < 0 || trial > 60) return toast('Los días de prueba deben estar entre 0 y 60.', 'error')
    setBusy(true)
    try {
      await unwrap(supabase.from('billing_settings').update({
        trial_days: trial, mp_enabled: f.mp_enabled,
        yape_number: f.yape_number || null, yape_name: f.yape_name || null,
        bank_name: f.bank_name || null, bank_account: f.bank_account || null, bank_cci: f.bank_cci || null,
        contact_whatsapp: f.contact_whatsapp || null,
      }).eq('id', 1))
      toast('Configuración guardada'); onSaved()
    } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Cómo cobras</h2>
      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Días de prueba gratis" hint="Para clientes que se registran solos (0 = sin prueba)"><Input type="number" min={0} max={60} value={f.trial_days} onChange={set('trial_days')} /></Field>
          <Field label="Tu WhatsApp de contacto"><Input value={f.contact_whatsapp ?? ''} inputMode="tel" onChange={set('contact_whatsapp')} /></Field>
          <Field label="Número de Yape / Plin"><Input value={f.yape_number ?? ''} inputMode="tel" onChange={set('yape_number')} /></Field>
          <Field label="Nombre del titular de Yape"><Input value={f.yape_name ?? ''} onChange={set('yape_name')} /></Field>
          <Field label="Banco"><Input value={f.bank_name ?? ''} onChange={set('bank_name')} /></Field>
          <Field label="Número de cuenta"><Input value={f.bank_account ?? ''} onChange={set('bank_account')} /></Field>
          <Field label="CCI (opcional)"><Input value={f.bank_cci ?? ''} onChange={set('bank_cci')} /></Field>
        </div>
        <Toggle checked={f.mp_enabled} onChange={(v) => setF({ ...f, mp_enabled: v })} label="Habilitar pago con tarjeta (Mercado Pago) — actívalo solo cuando ya configuraste sus secretos" />
        <Button loading={busy} onClick={save}>Guardar</Button>
      </Card>
    </section>
  )
}
