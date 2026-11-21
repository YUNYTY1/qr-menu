import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { PageLoader } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
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
  const { session, profile, memberships, loading, signOut } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <PageLoader label="Cargando tu cuenta…" />
  if (profile.is_superadmin) return <Navigate to="/superadmin" replace />
  if (memberships.length > 0) return <Navigate to={`/panel/${memberships[0].restaurant_id}`} replace />
  return (
    <div className="mx-auto mt-24 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold">Tu cuenta aún no tiene un restaurante asignado</h1>
      <p className="mt-2 text-sm text-slate-500">Contacta a Grupo Underty para activar tu acceso.</p>
      <Button className="mt-5" variant="secondary" onClick={signOut}>Cerrar sesión</Button>
    </div>
  )
}
