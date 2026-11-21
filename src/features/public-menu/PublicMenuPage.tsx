import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { DEFAULT_THEME } from '@/lib/theme'
import type { PublicMenuResponse } from '@/types'
import { Spinner } from '@/components/ui/Feedback'
import MenuView from './MenuView'

type State =
  | { s: 'loading' } | { s: 'notfound' } | { s: 'error'; msg: string }
  | { s: 'ready'; data: PublicMenuResponse }

export default function PublicMenuPage({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ s: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState({ s: 'loading' })
    if (!supabaseConfigured) { setState({ s: 'error', msg: 'La aplicación no está configurada (faltan variables de Supabase).' }); return }
    supabase.rpc('get_public_menu', { p_slug: slug }).then(({ data, error }) => {
      if (!alive) return
      if (error) return setState({ s: 'error', msg: errMsg(error) })
      if (!data) return setState({ s: 'notfound' })
      const d = data as PublicMenuResponse
      if (d.available) {
        document.title = d.restaurant.name
        d.theme = { ...DEFAULT_THEME, ...d.theme }
        const key = `underty-visit-${slug}`
        try {
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1')
            supabase.rpc('track_visit', { p_slug: slug }).then(() => {}, () => {})
          }
        } catch { /* sin sessionStorage */ }
      } else {
        document.title = d.restaurant.name
      }
      setState({ s: 'ready', data: d })
    }, (e) => alive && setState({ s: 'error', msg: errMsg(e) }))
    return () => { alive = false }
  }, [slug, attempt])

  if (state.s === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-slate-400"><Spinner className="h-8 w-8" /></div>
  }
  if (state.s === 'notfound') {
    return <Notice title="Restaurante no encontrado" text="Revisa que la dirección sea correcta." />
  }
  if (state.s === 'error') {
    return <Notice title="No pudimos cargar el menú" text={state.msg} action={<button onClick={() => setAttempt((a) => a + 1)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Reintentar</button>} />
  }
  const d = state.data
  if (!d.available) {
    return (
      <Notice title="Servicio temporalmente no disponible" text={`El menú de ${d.restaurant.name} no está disponible por el momento. Por favor, inténtalo más tarde.`}
        logo={d.restaurant.logo_url} />
    )
  }
  return <MenuView data={d} slug={slug} />
}

function Notice({ title, text, action, logo }: { title: string; text: string; action?: React.ReactNode; logo?: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
      <div className="max-w-sm text-center">
        {logo && <img src={logo} alt="" className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover" />}
        <h1 className="text-xl font-bold text-stone-900">{title}</h1>
        <p className="mt-2 text-sm text-stone-600">{text}</p>
        {action}
      </div>
    </div>
  )
}
