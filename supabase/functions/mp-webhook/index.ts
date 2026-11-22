// @ts-nocheck
// Edge Function: recibe el aviso de Mercado Pago y acredita el plan.
// NO confía en lo que dice el aviso: consulta el pago directamente a Mercado Pago con nuestro token,
// verifica que esté aprobado, que sea en PEN, que el monto cubra la orden y que la orden sea nuestra.
// La acreditación es idempotente (los reenvíos de Mercado Pago no duplican meses).
//
// Despliegue (importante, sin verificación de JWT porque lo llama Mercado Pago):
//   npx supabase functions deploy mp-webhook --no-verify-jwt --project-ref TU_REF
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ok = (msg: string) => new Response(msg, { status: 200 })

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url)
    let id = u.searchParams.get('data.id') ?? u.searchParams.get('id')
    let type = u.searchParams.get('type') ?? u.searchParams.get('topic')
    if (!id && req.method === 'POST') {
      const b = await req.json().catch(() => null)
      id = b?.data?.id ?? null
      type = type ?? b?.type ?? null
    }
    if (type !== 'payment' || !id) return ok('ignored')

    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpToken) return new Response('not configured', { status: 500 })

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(id))}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    if (res.status === 404) return ok('payment not found')
    if (!res.ok) return new Response('mp error', { status: 500 }) // Mercado Pago reintentará
    const pay = await res.json()
    if (pay.status !== 'approved') return ok('not approved')

    const orderId = String(pay.external_reference ?? '')
    if (!UUID.test(orderId)) return ok('no order')

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: order } = await admin.from('payment_orders').select('id,amount,status,provider').eq('id', orderId).maybeSingle()
    if (!order || order.provider !== 'mercadopago') return ok('unknown order')
    if (order.status === 'paid') return ok('already paid')

    if (pay.currency_id !== 'PEN' || Number(pay.transaction_amount) + 0.001 < Number(order.amount)) {
      console.error('Monto o moneda no coinciden', pay.id, pay.currency_id, pay.transaction_amount, order.amount)
      return ok('amount mismatch')
    }

    const { error } = await admin.rpc('fulfill_order', { p_order: order.id, p_method: 'Mercado Pago', p_ref: String(pay.id) })
    if (error) {
      if (error.code === '23505') return ok('duplicate') // ese pago ya se usó
      console.error('fulfill_order', error)
      return new Response('error', { status: 500 })
    }
    return ok('ok')
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})