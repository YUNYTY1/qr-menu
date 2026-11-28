import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { PageLoader } from '@/components/ui/Feedback'
import LandingPage from '@/features/public/LandingPage'

// Usuarios (por id) de los que ya sabemos que tienen contraseña.
// Evita repetir la consulta en cada cambio de ruta.
const passwordOk = new Set<string>()

/**
 * Devuelve:
 *  - true  -> tiene contraseña (o no aplica la comprobación)
 *  - false -> NO tiene contraseña: hay que mandarlo a crearla
 *  - null  -> todavía comprobando
 */
function usePasswordCheck(userId: string | undefined, skip: boolean): boolean | null {
  const cached = !!userId && passwordOk.has(userId)
  const [result, setResult] = useState<{ uid: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!userId || skip || cached) return
    let cancelled = false

    supabase.rpc('has_password').then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        // Si la función aún no existe o falla, no bloqueamos a nadie.
        console.error('has_password', error)
      }
      const ok = error ? true : Boolean(data)
      if (ok) passwordOk.add(userId)
      setResult({ uid: userId, ok })
    })

    return () => {
      cancelled = true
    }
  }, [userId, skip, cached])

  if (skip || !userId || cached) return true
  if (!result || result.uid !== userId) return null
  return result.ok
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const loc = useLocation()

  const skipPasswordCheck = !profile || profile.is_superadmin || !profile.otp_verified
  const hasPassword = usePasswordCheck(session?.user?.id, skipPasswordCheck)

  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!profile) return <PageLoader label="Cargando tu cuenta…" />
  if (!profile.is_superadmin && !profile.otp_verified) {
    return <Navigate to="/registro?verify_google=1" replace />
  }
  if (hasPassword === null) return <PageLoader label="Cargando tu cuenta…" />
  if (hasPassword === false) return <Navigate to="/registro?set_password=1" replace />
  return <>{children}</>
}

export function RequireSuperadmin({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.is_superadmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export function HomeRedirect() {
  const { session, profile, memberships, loading } = useAuth()

  const skipPasswordCheck = !profile || profile.is_superadmin || !profile.otp_verified
  const hasPassword = usePasswordCheck(session?.user?.id, skipPasswordCheck)

  if (loading) return <PageLoader />
  if (!session) return <LandingPage />
  if (!profile) return <PageLoader label="Cargando tu cuenta…" />
  if (profile.is_superadmin) return <Navigate to="/superadmin" replace />
  if (!profile.otp_verified) return <Navigate to="/registro?verify_google=1" replace />
  if (hasPassword === null) return <PageLoader label="Cargando tu cuenta…" />
  if (hasPassword === false) return <Navigate to="/registro?set_password=1" replace />
  if (memberships.length > 0) return <Navigate to={`/panel/${memberships[0].restaurant_id}`} replace />
  return <Navigate to="/empezar" replace />
}