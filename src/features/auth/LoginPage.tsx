import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isEmail } from '@/lib/validators'
import { Button } from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const { session, profile, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Paso de verificación OTP si el usuario intenta entrar sin haber confirmado su correo
  const [verifyStep, setVerifyStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  if (!loading && session && profile) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!isEmail(email)) return setError('Ingresa un correo válido.')
    if (mode === 'login' && password.length < 6) return setError('Ingresa tu contraseña.')
    setBusy(true)
    try {
      if (mode === 'login') {
        const cleanEmail = email.trim()
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (error) {
          if (/email not confirmed/i.test(error.message)) {
            await supabase.auth.resend({ type: 'signup', email: cleanEmail }).catch(() => {})
            setVerifyStep(true)
            setOtpCode('')
            setResendCooldown(60)
            setInfo('Tu correo aún no está confirmado. Te enviamos un nuevo código.')
            return
          }
          throw new Error(
            /invalid login/i.test(error.message)
              ? 'Correo o contraseña incorrectos.'
              : errMsg(error),
          )
        }
        await refresh()
        navigate('/', { replace: true })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setInfo('Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.')
      }
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const token = otpCode.replace(/\s+/g, '')
    if (token.length < 6) {
      return setError('Ingresa el código completo que te llegó al correo.')
    }
    setVerifyBusy(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'signup',
      })
      if (error) {
        throw new Error(
          /expired|invalid|token/i.test(error.message)
            ? 'El código es incorrecto o ya venció. Pide uno nuevo e inténtalo otra vez.'
            : errMsg(error),
        )
      }
      await refresh()
      navigate('/empezar', { replace: true })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setVerifyBusy(false)
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return
    setError(null)
    setInfo(null)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      })
      if (error) throw error
      setResendCooldown(60)
      setInfo('Te enviamos un nuevo código a tu correo.')
    } catch (err) {
      setError(errMsg(err))
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setInfo(null)
    setGoogleBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setError(errMsg(err))
      setGoogleBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo intacto */}
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
            La carta digital de tu restaurante, lista para pedir por WhatsApp.
          </h2>
          <p className="mt-4 max-w-md text-slate-300">
            Administra productos, precios, promociones y tu código QR desde un solo panel.
          </p>
        </div>
        <p className="relative text-sm text-slate-400">Grupo Underty</p>
      </div>

      {/* Columna derecha rediseñada */}
      <div className="relative flex flex-col justify-center bg-[#f3e8dc] px-6 py-10 sm:px-10">
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:left-8 sm:top-8"
        >
          <span aria-hidden="true">←</span>
          <span>Volver al inicio</span>
        </Link>

        <div className="mx-auto mt-6 w-full max-w-md sm:mt-0">
          {verifyStep ? (
            <div className="rounded-3xl bg-[#fbf5ee]/95 p-7 shadow-[0_14px_34px_-18px_rgba(107,68,35,0.28)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fae6d5] text-[#f05a1a]">
                <svg
                  className="h-6 w-6"
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
              </div>
              <h1 className="text-center text-2xl font-extrabold text-slate-900">
                Verifica tu correo
              </h1>
              <p className="mt-2 text-center text-sm text-slate-600">
                Enviamos un código de verificación a <strong>{email}</strong>. Pégalo aquí para
                activar tu cuenta.
              </p>

              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-otp-code"
                    className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Código de verificación
                  </label>
                  <input
                    id="login-otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="h-14 w-full rounded-xl border border-[#f05a1a] bg-white px-4 text-center font-mono text-2xl font-bold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 shadow-[0_0_0_3px_rgba(240,90,26,0.12)] focus:border-[#f05a1a] focus:outline-none"
                  />
                </div>

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
                  loading={verifyBusy}
                  className="h-12 w-full rounded-xl bg-[#f05a1a] text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(240,90,26,0.65)] transition hover:bg-[#dc4e12]"
                >
                  Confirmar e ingresar
                </Button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-2 text-xs text-slate-600">
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendCode}
                  className="font-bold text-[#f05a1a] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Reenviar código en ${resendCooldown}s`
                    : 'Reenviar código'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyStep(false)
                    setOtpCode('')
                    setError(null)
                    setInfo(null)
                  }}
                  className="text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Volver a iniciar sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Encabezado / tarjeta superior */}
              <div className="flex flex-col items-center text-center">
                <div className="flex w-full max-w-[260px] items-center justify-center rounded-3xl bg-[#fbf5ee]/90 px-6 py-6 shadow-[0_14px_34px_-18px_rgba(107,68,35,0.28)]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#fae6d5] p-3 ring-4 ring-[#f05a1a]/10">
                    <img
                      src="/logo.png"
                      alt="Underty Menu"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[32px]">
                  {mode === 'login' ? 'Bienvenido de nuevo' : 'Recuperar contraseña'}
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  {mode === 'login'
                    ? 'Ingresa a tu cuenta para continuar.'
                    : 'Te enviaremos un enlace a tu correo.'}
                </p>
              </div>

              {!supabaseConfigured && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.
                </div>
              )}

              <form onSubmit={submit} className="mt-7 space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
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
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingresa tu correo electrónico"
                      className="h-12 w-full rounded-xl border border-[#f05a1a] bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_0_0_3px_rgba(240,90,26,0.12)] focus:border-[#f05a1a] focus:outline-none"
                    />
                  </div>
                </div>

                {mode === 'login' && (
                  <div>
                    <label
                      htmlFor="login-password"
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
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingresa tu contraseña"
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
                  {mode === 'login' ? 'Iniciar sesión' : 'Enviar enlace'}
                </Button>

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

                {/* Separador "o" */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-300/60" />
                  <span className="text-xs font-medium text-slate-500">o</span>
                  <div className="h-px flex-1 bg-slate-300/60" />
                </div>

                {/* Continuar con Google */}
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

                <p className="pt-2 text-center text-xs text-slate-600">
                  ¿Aún no tienes cuenta?{' '}
                  <Link to="/registro" className="font-bold text-[#f05a1a] hover:underline">
                    Empieza gratis
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}