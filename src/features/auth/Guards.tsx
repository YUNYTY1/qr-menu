import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { PageLoader } from '@/components/ui/Feedback'
import LandingPage from '@/features/public/LandingPage'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!profile) return <PageLoader label="Cargando tu cuenta…" />
  if (!profile.is_superadmin && !profile.otp_verified) {
    return <Navigate to="/registro?verify_google=1" replace />
  }
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
  if (loading) return <PageLoader />
  if (!session) return <LandingPage />
  if (!profile) return <PageLoader label="Cargando tu cuenta…" />
  if (profile.is_superadmin) return <Navigate to="/superadmin" replace />
  if (!profile.otp_verified) return <Navigate to="/registro?verify_google=1" replace />
  if (memberships.length > 0) return <Navigate to={`/panel/${memberships[0].restaurant_id}`} replace />
  return <Navigate to="/empezar" replace />
}