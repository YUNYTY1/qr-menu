import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isEmail } from '@/lib/validators'
import { Button } from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { useAuth } from './AuthContext'

type AuthTab = 'login' | 'register'
type Mode = 'login' | 'register' | 'forgot'

interface AuthViewProps {
  initialTab?: AuthTab
}

export default function AuthView({ initialTab = 'login' }: AuthViewProps) {
  const { session, profile, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [params, setSearchParams] = useSearchParams()
  const plan = params.get('plan') ?? ''

  const [mode, setMode] = useState<Mode>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setMode(initialTab)
    setError(null)
    setInfo(null)
    setSent(false)
  }, [initialTab])

  if (!loading && session && profile) return <Navigate to="/" replace />

  function switchTab(nextTab: AuthTab) {
    setMode(nextTab)
    setError(null)
    setInfo(null)
    setSent(false)
    setShowPassword(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!isEmail(email)) return setError('Ingresa un correo válido.')

    if (mode === 'login') {
      if (password.length < 6) return setError('Ingresa tu contraseña.')
      setBusy(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          throw new Error(
            /invalid login/i.test(error.message)
              ? 'Correo o contraseña incorrectos.'
              : errMsg(error),
          )
        }
        await refresh()
        navigate('/', { replace: true })
      } catch (err) {
        setError(errMsg(err))
      } finally {
        setBusy(false)
      }
      return
    }

    if (mode === 'register') {
      if (password.length < 8) {
        return setError('La contraseña debe tener al menos 8 caracteres.')
      }
      setBusy(true)
      try {
        const next = `/empezar${plan ? `?plan=${encodeURIComponent(plan)}` : ''}`
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        })
        if (error) throw error
        if (data.session) {
          await refresh()
          navigate(next, { replace: true })
        } else {
          setSent(true)
        }
      } catch (err) {
        const m = errMsg(err)
        setError(
          /already registered|already been registered/i.test(m)
            ? 'Ese correo ya tiene cuenta. Inicia sesión.'
            : m,
        )
      } finally {
        setBusy(false)
      }
      return
    }

    // mode === 'forgot'
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setInfo('Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setInfo(null)
    setGoogleBusy(true)
    try {
      const redirectTo =
        mode === 'register'
          ? `${window.location.origin}/empezar${plan ? `?plan=${encodeURIComponent(plan)}` : ''}`
          : window.location.origin

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) throw error
    } catch (err) {
      setError(errMsg(err))
      setGoogleBusy(false)
    }
  }

  const activeTab: AuthTab = mode === 'register' ? 'register' : 'login'

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <Link
          to="/"
          className="relative inline-flex w-fit items-center gap-3 transition hover:opacity-85"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Icon name="product" />
          </div>
          <span className="text-lg font-bold">Underty Menu</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">
            {mode === 'register'
              ? 'Crea tu cuenta y arma tu catálogo listo para pedir por WhatsApp.'
              : 'La carta digital de tu negocio, lista para pedir por WhatsApp.'}
          </h2>
          <p className="mt-4 max-w-md text-slate-300">
            Administra productos, precios, promociones y tu código QR desde un solo panel.
          </p>
        </div>
        <p className="relative text-sm text-slate-400">Grupo Underty</p>
      </div>

      {/* Columna derecha unificada */}
      <div className="relative flex flex-col justify-center bg-[#f3e8dc] px-6 py-10 sm:px-10">
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:left-8 sm:top-8"
        >
          <span aria-hidden="true">←</span>
          <span>Volver al inicio</span>
        </Link>

        <div className="mx-auto mt-6 w-full max-w-md sm:mt-0">
          {sent ? (
            <div className="rounded-3xl bg-[#fbf5ee]/95 p-7 text-center shadow-[0_14px_34px_-18px_rgba(107,68,35,0.28)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Icon name="check" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-slate-600">
                Te enviamos un enlace a <strong>{email}</strong> para confirmar tu cuenta. Al abrirlo
                podrás configurar tu negocio.
              </p>
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="mt-5 inline-block text-sm font-bold text-[#f05a1a] hover:underline"
              >
                Ya confirmé, iniciar sesión
              </button>
            </div>
          ) : (
            <>
              {/* Logo limpio sin nombre ni línea */}
              <div className="flex flex-col items-center text-center">
                <div className="flex w-full max-w-[240px] items-center justify-center rounded-3xl bg-[#fbf5ee]/90 px-6 py-5 shadow-[0_14px_34px_-18px_rgba(107,68,35,0.28)]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fae6d5] p-3 ring-4 ring-[#f05a1a]/10">
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                {/* Pestañas en el mismo contenedor */}
                <div
                  role="tablist"
                  aria-label="Autenticación"
                  className="mt-5 grid w-full grid-cols-2 rounded-2xl bg-[#fbf5ee]/85 p-1 ring-1 ring-[#6b4423]/15"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'login'}
                    onClick={() => switchTab('login')}
                    className={`rounded-xl py-2.5 text-sm font-bold transition ${
                      activeTab === 'login'
                        ? 'bg-[#f05a1a] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'register'}
                    onClick={() => switchTab('register')}
                    className={`rounded-xl py-2.5 text-sm font-bold transition ${
                      activeTab === 'register'
                        ? 'bg-[#f05a1a] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[30px]">
                  {mode === 'login'
                    ? 'Bienvenido de nuevo'
                    : mode === 'register'
                      ? 'Crea tu cuenta'
                      : 'Recuperar contraseña'}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {mode === 'login'
                    ? 'Ingresa a tu cuenta para continuar.'
                    : mode === 'register'
                      ? plan
                        ? `Empieza gratis · Plan seleccionado: ${plan}`
                        : 'Empieza gratis. Sin tarjeta.'
                      : 'Te enviaremos un enlace a tu correo.'}
                </p>
              </div>

              {!supabaseConfigured && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Tu nombre
                    </label>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-3.5 text-slate-400">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. María Pérez"
                        className="h-12 w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#f05a1a] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3.5 text-slate-400">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingresa tu correo electrónico"
                      className="h-12 w-full rounded-xl border border-[#f05a1a] bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_0_0_3px_rgba(240,90,26,0.12)] focus:border-[#f05a1a] focus:outline-none"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label
                      htmlFor="auth-password"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Contraseña
                    </label>
                    <div className="relative flex items-center">
                      <span className="pointer-events-none absolute left-3.5 text-slate-400">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === 'register' ? 'Mínimo 8 caracteres' : 'Ingresa tu contraseña'
                        }
                        className="h-12 w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#f05a1a] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? (
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                {info && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {info}
                  </p>
                )}

                <Button
                  type="submit"
                  loading={busy}
                  className="mt-2 h-12 w-full rounded-xl bg-[#f05a1a] text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(240,90,26,0.65)] transition hover:bg-[#dc4e12]"
                >
                  {mode === 'login'
                    ? 'Iniciar sesión'
                    : mode === 'register'
                      ? 'Crear cuenta'
                      : 'Enviar enlace'}
                </Button>

                {mode !== 'register' && (
                  <div className="pt-0.5 text-center">
                    <button
                      type="button"
                      className="text-xs font-medium text-[#f05a1a] hover:underline"
                      onClick={() => {
                        setMode(mode === 'login' ? 'forgot' : 'login')
                        setError(null)
                        setInfo(null)
                      }}
                    >
                      {mode === 'login' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
                    </button>
                  </div>
                )}

                {mode !== 'forgot' && (
                  <>
                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-slate-300/60" />
                      <span className="text-xs font-medium text-slate-500">o</span>
                      <div className="h-px flex-1 bg-slate-300/60" />
                    </div>

                    <button
                      type="button"
                      disabled={googleBusy}
                      onClick={handleGoogleSignIn}
                      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200/90 bg-white text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.54-1.14 2.85-2.4 3.72v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.93z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                        />
                      </svg>
                      <span>{googleBusy ? 'Redirigiendo...' : 'Continuar con Google'}</span>
                    </button>
                  </>
                )}

                <p className="pt-2 text-center text-xs text-slate-600">
                  {activeTab === 'login' ? (
                    <>
                      ¿Aún no tienes cuenta?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('register')}
                        className="font-bold text-[#f05a1a] hover:underline"
                      >
                        Empieza gratis
                      </button>
                    </>
                  ) : (
                    <>
                      ¿Ya tienes cuenta?{' '}
                      <button
                        type="button"
                        onClick={() => switchTab('login')}
                        className="font-bold text-[#f05a1a] hover:underline"
                      >
                        Inicia sesión
                      </button>
                    </>
                  )}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}