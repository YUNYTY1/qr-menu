import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)

// Solo se usa la anon key. La seguridad real está en las políticas RLS de la base de datos.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

type Result<T> = { data: T | null; error: { message: string; code?: string } | null }

/** Lanza el error de Supabase si lo hay y devuelve los datos. */
export async function unwrap<T = any>(p: PromiseLike<Result<T>>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data as T
}
