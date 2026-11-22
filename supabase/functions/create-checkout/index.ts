// @ts-nocheck
// Edge Function: crea el pago de Mercado Pago (Checkout Pro) para renovar/cambiar de plan.
// El monto SIEMPRE se calcula aquí en el servidor (precio del plan x meses); el navegador no lo decide.
//
// Secretos: MP_ACCESS_TOKEN (Access Token de producción o de prueba) y APP_URL (ej. https://app.grupounderty.com)
// Despliegue: npx supabase functions deploy create-checkout --project-ref TU_REF
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
    const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '')
    if (!mpToken || !appUrl) return json({ error: 'El pago con tarjeta aún no está configurado.' }, 500)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autenticado' }, 401)
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)

    const body = await req.json().catch(() => null)
    const restaurantId = body?.restaurant_id
    const planId = body?.plan_id
    const months = Number(body?.months)
    if (typeof restaurantId !== 'string' || typeof planId !== 'string' || ![1, 3, 6, 12].includes(months))
      return json({ error: 'Datos inválidos.' }, 400)

    // El usuario debe pertenecer a ese restaurante
    const { data: access } = await caller.rpc('has_restaurant_access', { rid: restaurantId })
    if (access !== true) return json({ error: 'No tienes acceso a este restaurante.' }, 403)

    const admin = createClient(url, service)
    const { data: settings } = await admin.from('billing_settings').select('mp_enabled').eq('id', 1).maybeSingle()
    if (!settings?.mp_enabled) return json({ error: 'El pago con tarjeta no está habilitado.' }, 400)

    const { data: sub } = await admin.from('subscriptions').select('id').eq('restaurant_id', restaurantId).maybeSingle()
    const { data: plan } = await admin.from('plans').select('id,name,price,is_active').eq('id', planId).maybeSingle()
    if (!sub || !plan || !plan.is_active) return json({ error: 'Plan no disponible.' }, 400)

    const amount = Math.round(Number(plan.price) * months * 100) / 100
    if (!(amount > 0)) return json({ error: 'Este plan no tiene precio configurado.' }, 400)

    const { data: order, error: oErr } = await admin.from('payment_orders').insert({
      restaurant_id: restaurantId, subscription_id: sub.id, plan_id: plan.id, months, amount,
      provider: 'mercadopago', created_by: user.id,
    }).select('id').single()
    if (oErr || !order) return json({ error: 'No se pudo crear la orden de pago.' }, 500)

    const back = `${appUrl}/panel/${restaurantId}/plan`
    const pref: Record<string, unknown> = {
      items: [{
        id: plan.id,
        title: `Underty Menu - Plan ${plan.name} (${months} ${months === 1 ? 'mes' : 'meses'})`,
        quantity: 1, unit_price: amount, currency_id: 'PEN',
      }],
      external_reference: order.id,
      notification_url: `${url}/functions/v1/mp-webhook`,
      back_urls: { success: `${back}?pago=ok`, failure: `${back}?pago=error`, pending: `${back}?pago=pendiente` },
    }
    if (appUrl.startsWith('https://')) pref.auto_return = 'approved'

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pref),
    })
    if (!res.ok) {
      console.error('Mercado Pago preference error', res.status, (await res.text()).slice(0, 400))
      await admin.from('payment_orders').update({ status: 'cancelled' }).eq('id', order.id)
      return json({ error: 'Mercado Pago no pudo crear el pago. Inténtalo de nuevo o paga por Yape.' }, 502)
    }
    const data = await res.json()
    const checkout = mpToken.startsWith('TEST-') ? (data.sandbox_init_point ?? data.init_point) : data.init_point
    if (!checkout) return json({ error: 'Respuesta inesperada de Mercado Pago.' }, 502)
    return json({ url: checkout, order_id: order.id })
  } catch (e) {
    console.error(e)
    return json({ error: 'Error inesperado en el servidor.' }, 500)
  }
})