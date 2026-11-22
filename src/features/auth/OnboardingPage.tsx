import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { slugify } from '@/lib/format'
import { isPhone, isSlug } from '@/lib/validators'
import { publicUrl } from '@/lib/tenant'
import type { PublicPlansResponse } from '@/types/billing'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { PageLoader } from '@/components/ui/Feedback'
import { useAuth } from './AuthContext'

/** Paso final del registro: el usuario crea su restaurante y empieza la prueba gratis. */
export default function OnboardingPage() {
  const { memberships, profile, loading, refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data } = useData(() => unwrap<PublicPlansResponse>(supabase.rpc('get_public_plans')), [])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [planId, setPlanId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data || planId) return
    const byCode = data.plans.find((p) => p.code === params.get('plan'))
    setPlanId((byCode ?? data.plans[Math.min(1, data.plans.length - 1)])?.id ?? '')
  }, [data, planId, params])

  if (loading || !profile) return <PageLoader />
  if (profile.is_superadmin) return <Navigate to="/superadmin" replace />
  if (memberships.length > 0) return <Navigate to={`/panel/${memberships[0].restaurant_id}`} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('Escribe el nombre de tu restaurante.')
    if (!isSlug(slug)) return setError('La dirección solo admite minúsculas, números y guiones (3 a 40 caracteres).')
    if (!whatsapp.trim() || !isPhone(whatsapp)) return setError('Ingresa el WhatsApp donde recibirás los pedidos.')
    if (!planId) return setError('Elige un plan.')
    setBusy(true)
    try {
      const id = await unwrap<string>(supabase.rpc('create_my_restaurant', { p_name: name, p_slug: slug, p_plan: planId, p_whatsapp: whatsapp }))
      await refresh()
      navigate(`/panel/${id}/products`, { replace: true })
    } catch (err) {
      const m = errMsg(err)
      setError(/duplicado|duplicate/i.test(m) ? 'Esa dirección ya está en uso. Prueba con otra.' : m)
    } finally { setBusy(false) }
  }

  const trial = data?.trial_days ?? 7
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Crea tu restaurante</h1>
          <p className="mt-1 text-sm text-slate-500">{trial > 0 ? `Empiezas con ${trial} días gratis.` : 'Último paso para empezar.'}</p>
        </div>
        <Field label="Nombre del restaurante">
          <Input value={name} maxLength={120} autoFocus
            onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)) }} />
        </Field>
        <Field label="Dirección de tu menú" hint={`Tu menú: ${publicUrl(slug || 'tu-restaurante')}`}>
          <Input value={slug} maxLength={40} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase()) }} />
        </Field>
        <Field label="WhatsApp para recibir pedidos" hint="Con o sin código de país">
          <Input value={whatsapp} inputMode="tel" onChange={(e) => setWhatsapp(e.target.value)} placeholder="987654321" />
        </Field>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Plan</span>
          <div className="space-y-2">
            {data?.plans.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${planId === p.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} className="accent-orange-600" />
                  <span className="font-semibold">{p.name}</span>
                </span>
                <span className="text-slate-600">S/ {Number(p.price).toFixed(0)}/mes</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={busy} className="w-full">Crear restaurante y empezar</Button>
        <button type="button" onClick={signOut} className="w-full text-center text-xs text-slate-400 hover:text-slate-600">Cerrar sesión</button>
      </form>
    </div>
  )
}