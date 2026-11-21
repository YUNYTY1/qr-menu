// Edge Function: crea la cuenta de acceso de un restaurante.
// Usa la service_role key (solo existe en el servidor de Supabase, nunca en el frontend).
// Despliegue: supabase functions deploy create-restaurant-user
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autenticado' }, 401)

    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)

    const admin = createClient(url, service)
    const { data: prof } = await admin.from('profiles').select('is_superadmin').eq('id', user.id).maybeSingle()
    if (!prof?.is_superadmin) return json({ error: 'Solo Grupo Underty puede crear accesos' }, 403)

    const { restaurant_id, email, password, full_name, role } = await req.json()
    if (!restaurant_id || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Correo inválido' }, 400)
    if (typeof password !== 'string' || password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
    const memberRole = role === 'editor' ? 'editor' : 'owner'

    const { data: rest } = await admin.from('restaurants').select('id').eq('id', restaurant_id).maybeSingle()
    if (!rest) return json({ error: 'Restaurante no encontrado' }, 404)

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(), password, email_confirm: true,
      user_metadata: { full_name: full_name ?? '' },
    })
    if (cErr || !created.user) return json({ error: cErr?.message ?? 'No se pudo crear el usuario' }, 400)

    const { error: mErr } = await admin.from('restaurant_users')
      .insert({ restaurant_id, user_id: created.user.id, role: memberRole })
    if (mErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: mErr.message }, 400)
    }
    return json({ ok: true, user_id: created.user.id })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
