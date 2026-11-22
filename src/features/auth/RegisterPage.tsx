import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isEmail } from '@/lib/validators'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import Icon from '@/components/ui/Icon'
import { useAuth } from './AuthContext'

export default function RegisterPage() {
  const { session, profile, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const plan = params.get('plan') ?? ''
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (!loading && session && profile) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isEmail(email)) return setError('Ingresa un correo válido.')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    setBusy(true)
    try {
      const next = `/empezar${plan ? `?plan=${encodeURIComponent(plan)}` : ''}`
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}${next}` },
      })
      if (error) throw error
      if (data.session) {            // confirmación de correo desactivada: entra directo
        await refresh()
        navigate(next, { replace: true })
      } else {
        setSent(true)                // hay que confirmar el correo primero
      }
    } catch (err) {
      const m = errMsg(err)
      setError(/already registered|already been registered/i.test(m) ? 'Ese correo ya tiene cuenta. Inicia sesión.' : m)
    } finally { setBusy(false) }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" /></div>
          <h1 className="text-xl font-bold">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-slate-600">Te enviamos un enlace a <strong>{email}</strong> para confirmar tu cuenta. Al abrirlo podrás crear tu restaurante.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">Ya confirmé, iniciar sesión</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">← Underty Menu</Link>
        <div>
          <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">Empieza gratis. Sin tarjeta.</p>
        </div>
        {!supabaseConfigured && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Falta configurar Supabase en el archivo .env.</div>}
        <Field label="Tu nombre"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} /></Field>
        <Field label="Correo"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" /></Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={busy} className="w-full">Crear cuenta</Button>
        <p className="text-center text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Inicia sesión</Link></p>
      </form>
    </div>
  )
}