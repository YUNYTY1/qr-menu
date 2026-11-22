import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { effStatus, one } from '@/lib/status'
import { fmtDate, money, todayLima } from '@/lib/format'
import { uploadProof } from '@/lib/proofs'
import { cleanPhone } from '@/lib/wa'
import type { Payment, Plan, Subscription } from '@/types'
import { MONTH_OPTIONS, monthsLabel, type BillingSettings, type PaymentOrder } from '@/types/billing'
import { Button } from '@/components/ui/Button'
import { Badge, Card, ErrorBox, PageHeader, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Textarea } from '@/components/ui/Form'
import { useRestaurant } from './RestaurantContext'

const daysUntil = (iso: string) =>
  Math.ceil((Date.parse(`${iso}T00:00:00`) - Date.parse(`${todayLima()}T00:00:00`)) / 86400000)

export default function PlanPage() {
  const { restaurant, reload: reloadCtx, isSuperadmin } = useRestaurant()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const pago = params.get('pago')

  const { data, loading, error, reload } = useData(async () => {
    const id = restaurant.id
    const [sub, plans, settings, orders, payments] = await Promise.all([
      unwrap<any>(supabase.from('subscriptions').select('*, plans(*)').eq('restaurant_id', id).maybeSingle()),
      unwrap<Plan[]>(supabase.from('plans').select('*').eq('is_active', true).order('price')),
      unwrap<BillingSettings>(supabase.from('billing_settings').select('*').eq('id', 1).single()),
      unwrap<PaymentOrder[]>(supabase.from('payment_orders').select('*').eq('restaurant_id', id).order('created_at', { ascending: false }).limit(8)),
      unwrap<Payment[]>(supabase.from('subscription_payments').select('*').eq('restaurant_id', id).order('paid_at', { ascending: false }).limit(6)),
    ])
    return { sub: sub as Subscription | null, plans, settings, orders, payments }
  }, [restaurant.id])

  const [planId, setPlanId] = useState('')
  const [months, setMonths] = useState<number>(1)
  const [showManual, setShowManual] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'mp' | 'manual' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (data?.sub && !planId) setPlanId(data.sub.plan_id) }, [data, planId])

  // Al volver de Mercado Pago el aviso puede tardar unos segundos: se consulta varias veces
  const lastStatus = useRef<string | null>(null)
  useEffect(() => {
    if (pago !== 'ok' && pago !== 'pendiente') return
    let n = 0
    const t = setInterval(() => { reload(); if (++n >= 8) clearInterval(t) }, 5000)
    return () => clearInterval(t)
  }, [pago]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data?.sub) return
    const st = effStatus(data.sub)
    if (lastStatus.current && lastStatus.current !== st) reloadCtx()
    lastStatus.current = st
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? 'Error'} onRetry={reload} />
  const { sub, plans, settings, orders, payments } = data
  const status = effStatus(sub)
  const current = one<Plan>(sub?.plans as any)
  const chosen = plans.find((p) => p.id === planId) ?? plans[0]
  const total = chosen ? Math.round(Number(chosen.price) * months * 100) / 100 : 0
  const days = sub?.end_date ? daysUntil(sub.end_date) : null
  const hasManual = !!(settings.yape_number || settings.bank_account)
  const contact = settings.contact_whatsapp ? cleanPhone(settings.contact_whatsapp) : null

  async function payMP() {
    if (!chosen) return
    setBusy('mp')
    try {
      const { data: res, error } = await supabase.functions.invoke('create-checkout', { body: { restaurant_id: restaurant.id, plan_id: chosen.id, months } })
      if (error) {
        let msg = errMsg(error)
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg } catch { /* */ } }
        throw new Error(msg)
      }
      window.location.href = res.url
    } catch (e) { toast(errMsg(e), 'error'); setBusy(null) }
  }

  async function sendProof() {
    if (!chosen) return
    if (!file) return toast('Sube la captura de tu pago (Yape, Plin o transferencia).', 'error')
    setBusy('manual')
    try {
      const path = await uploadProof(restaurant.id, file)
      await unwrap(supabase.rpc('create_manual_payment_order', { p_restaurant: restaurant.id, p_plan: chosen.id, p_months: months, p_proof_path: path, p_note: note || null }))
      toast('Comprobante enviado. Te activaremos el plan apenas lo confirmemos.')
      setFile(null); setNote(''); setShowManual(false)
      if (fileRef.current) fileRef.current.value = ''
      reload()
    } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }

  const orderTone = { pending: 'amber', paid: 'green', rejected: 'red', cancelled: 'slate' } as const
  const orderLabel = { pending: 'En revisión', paid: 'Pagado', rejected: 'Rechazado', cancelled: 'Cancelado' } as const

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Mi plan" subtitle="Elige tu plan y renueva cuando quieras." />

      {pago === 'ok' && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">¡Gracias! Estamos confirmando tu pago con Mercado Pago. Tu plan se actualiza en unos segundos. Si no cambia en unos minutos, escríbenos.</p>}
      {pago === 'pendiente' && <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800">Tu pago está pendiente en Mercado Pago. Apenas se apruebe, tu plan se activará solo.</p>}
      {pago === 'error' && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">El pago no se completó. Puedes intentarlo de nuevo o pagar por Yape.</p>}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan actual</p>
          <p className="mt-1 text-xl font-bold">{current?.name ?? '—'} <Badge status={status} /></p>
          <p className="mt-1 text-sm text-slate-500">
            {sub?.end_date ? `${status === 'pendiente' ? 'La prueba termina' : 'Vence'} el ${fmtDate(sub.end_date)}${days !== null && days >= 0 ? ` (${days} día${days === 1 ? '' : 's'})` : ''}` : 'Sin fecha de vencimiento'}
          </p>
        </div>
        {(status === 'vencido' || status === 'suspendido' || status === 'cancelado') && (
          <p className="max-w-xs text-sm text-amber-700">Tu menú público no se muestra. Paga tu plan para reactivarlo; tus datos están guardados.</p>
        )}
      </Card>

      {isSuperadmin && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Estás viendo esto como Grupo Underty. Los pagos de clientes se aprueban desde “Pagos”.</p>}

      <Card className="space-y-5">
        <h2 className="font-semibold">1. Elige tu plan</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
              className={`rounded-xl border p-4 text-left transition ${chosen?.id === p.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 hover:border-slate-300'}`}>
              <p className="font-bold">{p.name} {current?.id === p.id && <Pill tone="green">Actual</Pill>}</p>
              <p className="text-lg font-extrabold text-brand-700">S/ {Number(p.price).toFixed(0)}<span className="text-xs font-medium text-slate-500"> /mes</span></p>
              <p className="mt-1 text-xs text-slate-500">{p.limits.max_products < 0 ? 'Productos ilimitados' : `${p.limits.max_products} productos`}{p.limits.max_branches > 1 ? ` · ${p.limits.max_branches} sucursales` : ''}</p>
            </button>
          ))}
        </div>

        <h2 className="font-semibold">2. Elige el periodo</h2>
        <div className="flex flex-wrap gap-2">
          {MONTH_OPTIONS.map((m) => (
            <button key={m} type="button" onClick={() => setMonths(m)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${months === m ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{monthsLabel(m)}</button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <span className="text-sm text-slate-600">Total a pagar ({chosen?.name}, {monthsLabel(months)})</span>
          <span className="text-2xl font-extrabold">{money('S/', total)}</span>
        </div>

        <h2 className="font-semibold">3. Paga</h2>
        <div className="flex flex-wrap gap-3">
          {settings.mp_enabled && <Button loading={busy === 'mp'} disabled={total <= 0} onClick={payMP}>💳 Pagar con tarjeta (Mercado Pago)</Button>}
          {hasManual && <Button variant={settings.mp_enabled ? 'secondary' : 'primary'} onClick={() => setShowManual((v) => !v)}>📱 Pagar con Yape / transferencia</Button>}
        </div>
        {!settings.mp_enabled && !hasManual && (
          <p className="text-sm text-slate-600">Para pagar, escríbenos{contact ? <> por <a className="font-semibold text-brand-700 underline" href={`https://wa.me/${contact}`} target="_blank" rel="noreferrer">WhatsApp</a></> : ''} y te indicamos cómo.</p>
        )}

        {showManual && hasManual && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold">Paga exactamente <span className="text-brand-700">{money('S/', total)}</span> a:</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {settings.yape_number && <li>📱 <strong>Yape / Plin:</strong> {settings.yape_number}{settings.yape_name ? ` (${settings.yape_name})` : ''}</li>}
              {settings.bank_account && <li>🏦 <strong>{settings.bank_name || 'Banco'}:</strong> {settings.bank_account}{settings.bank_cci ? ` · CCI ${settings.bank_cci}` : ''}</li>}
            </ul>
            <p className="text-xs text-slate-500">Luego sube la captura del pago. Confirmamos y activamos tu plan (normalmente en pocas horas).</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
            <Field label="Nota (opcional)"><Textarea value={note} maxLength={300} rows={2} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: pagué desde el Yape de Juan" /></Field>
            <Button loading={busy === 'manual'} onClick={sendProof}>Enviar comprobante</Button>
          </div>
        )}
      </Card>

      {orders.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Mis pagos</h2>
          <div className="divide-y divide-slate-100">
            {orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{money('S/', Number(o.amount))} · {monthsLabel(o.months)} · {o.provider === 'mercadopago' ? 'Tarjeta' : 'Yape / transferencia'}</p>
                  <p className="text-xs text-slate-500">{fmtDate(o.created_at)}{o.review_note ? ` · ${o.review_note}` : ''}</p>
                </div>
                <Pill tone={orderTone[o.status]}>{orderLabel[o.status]}</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}
      {payments.length > 0 && <p className="text-xs text-slate-400">Último pago registrado: {fmtDate(payments[0].paid_at)} · {money('S/', Number(payments[0].amount))}</p>}
    </div>
  )
}
