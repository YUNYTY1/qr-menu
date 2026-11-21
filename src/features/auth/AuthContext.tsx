import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { one } from '@/lib/status'
import type { Membership, Profile } from '@/types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  memberships: Membership[]
  loading: boolean
  recovery: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  const loadUser = useCallback(async (uid: string) => {
    const [p, m] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('restaurant_users').select('restaurant_id, role, restaurants(id,name,slug)').eq('user_id', uid),
    ])
    setProfile((p.data as Profile) ?? null)
    setMemberships(
      ((m.data as any[]) ?? [])
        .map((x) => ({ restaurant_id: x.restaurant_id, role: x.role, restaurant: one<any>(x.restaurants) }))
        .filter((x) => x.restaurant),
    )
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session) await loadUser(data.session.user.id)
  }, [loadUser])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session) await loadUser(data.session.user.id)
      if (alive) setLoading(false)
    }).catch(() => alive && setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') { setProfile(null); setMemberships([]) }
      // setTimeout evita bloquear el callback de auth con llamadas a la API
      if (s && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) setTimeout(() => { loadUser(s.user.id) }, 0)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [loadUser])

  const signOut = useCallback(async () => { await supabase.auth.signOut() }, [])

  return (
    <Ctx.Provider value={{ session, profile, memberships, loading, recovery, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  )
}
