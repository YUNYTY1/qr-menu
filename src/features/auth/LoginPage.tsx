import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isEmail } from '@/lib/validators'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import Icon from '@/components/ui/Icon'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const { session, profile, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (!loading && session && profile) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null)
    if (!isEmail(email)) return setError('Ingresa un correo válido.')
    if (mode === 'login' && password.length < 6) return setError('Ingresa tu contraseña.')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error(/invalid login/i.test(error.message) ? 'Correo o contraseña incorrectos.' : errMsg(error))
        await refresh()
        navigate('/', { replace: true })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
        if (error) throw error
        setInfo('Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.')
      }
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600"><Icon name="product" /></div>
          <span className="text-lg font-bold">Underty Menu</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">La carta digital de tu restaurante, lista para pedir por WhatsApp.</h2>
          <p className="mt-4 max-w-md text-slate-300">Administra productos, precios, promociones y tu código QR desde un solo panel.</p>
        </div>
        <p className="relative text-sm text-slate-400">Grupo Underty</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}</h1>
            <p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Accede a tu panel de administración.' : 'Te enviaremos un enlace a tu correo.'}</p>
          </div>
          {!supabaseConfigured && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.</div>}
          <Field label="Correo"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" /></Field>
          {mode === 'login' && <Field label="Contraseña"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{info}</p>}
          <Button type="submit" loading={busy} className="w-full">{mode === 'login' ? 'Entrar' : 'Enviar enlace'}</Button>
          <button type="button" className="w-full text-center text-sm text-brand-700 hover:underline"
            onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(null); setInfo(null) }}>
            {mode === 'login' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
          </button>
          <p className="text-center text-sm text-slate-500">¿Aún no tienes cuenta? <Link to="/registro" className="font-semibold text-brand-700 hover:underline">Empieza gratis</Link></p>
        </form>
      </div>
    </div>
  )
}