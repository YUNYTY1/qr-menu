import { Link } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { useData } from '@/hooks/useData'
import type { PublicPlansResponse } from '@/types/billing'
import Icon from '@/components/ui/Icon'

const FAQ = [
  ['¿Necesito saber de tecnología?', 'No. Subes la foto de tu carta y la inteligencia artificial arma tus categorías y productos. Tú solo revisas y corriges.'],
  ['¿Cómo reciben los pedidos mis clientes?', 'Escanean el QR, eligen sus platos y se abre WhatsApp con el pedido listo hacia tu número. Tú lo recibes como cualquier mensaje.'],
  ['¿Qué pasa si no pago un mes?', 'Tu menú muestra “servicio temporalmente no disponible”. Tus datos no se borran: al renovar todo vuelve a la normalidad.'],
  ['¿Cómo pago?', 'Con Yape, Plin o transferencia, y también con tarjeta cuando esté habilitado. Tu plan se activa apenas se confirma el pago.'],
]

export default function LandingPage() {
  const { data } = useData(() => unwrap<PublicPlansResponse>(supabase.rpc('get_public_plans')), [])
  const trial = data?.trial_days ?? 7

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon name="product" /></div>
            <span className="font-bold">Underty Menu</span>
          </div>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <a href="#planes" className="hidden px-3 py-2 text-slate-600 hover:text-slate-900 sm:block">Planes</a>
            <Link to="/login" className="px-3 py-2 text-slate-600 hover:text-slate-900">Iniciar sesión</Link>
            <Link to="/registro" className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">Empezar gratis</Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <p className="mx-auto mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            {trial > 0 ? `${trial} días gratis · sin tarjeta` : 'Carta digital para restaurantes'}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Tu carta digital con QR y pedidos por <span className="text-brand-600">WhatsApp</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Sube la foto de tu carta y la IA la convierte en un menú listo para compartir. Tus clientes piden desde el celular; tú recibes el pedido en WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/registro" className="rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700">Crear mi carta gratis</Link>
            <a href="#planes" className="rounded-xl border border-slate-300 px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-50">Ver planes</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['qr', 'Código QR listo para imprimir', 'Descarga tu QR y el cartel A4 para mesas y mostrador.'],
            ['chat', 'Pedidos por WhatsApp', 'El cliente arma su pedido y te lo envía con un toque. Sin comisiones por venta.'],
            ['palette', 'Con tu marca', 'Tu logo, tus colores y tus fotos. Cambias precios o marcas “agotado” en segundos.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon name={icon as any} /></div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl bg-slate-900 p-8 text-center text-white">
          <p className="text-sm font-semibold text-brand-300">✨ Novedad</p>
          <h2 className="mt-1 text-2xl font-bold">Importa tu carta con inteligencia artificial</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">Una foto o PDF de tu carta y en segundos tienes categorías, productos y precios. Revisas, corriges y publicas.</p>
        </div>
      </section>

      <section id="planes" className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Planes simples</h2>
          <p className="mt-2 text-center text-slate-600">{trial > 0 ? `Prueba ${trial} días gratis. ` : ''}Cambia de plan cuando quieras.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(data?.plans ?? []).map((p, i, all) => {
              const featured = all.length === 3 && i === 1
              const l = p.limits
              return (
                <div key={p.id} className={`relative flex flex-col rounded-2xl border bg-white p-6 ${featured ? 'border-brand-500 shadow-xl' : 'border-slate-200'}`}>
                  {featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">Más elegido</span>}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="mt-2 text-4xl font-extrabold">S/ {Number(p.price).toFixed(0)}<span className="text-base font-medium text-slate-500"> /mes</span></p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                    <li>✓ {l.max_products < 0 ? 'Productos ilimitados' : `Hasta ${l.max_products} productos`}</li>
                    <li>✓ Menú digital + código QR</li>
                    <li>✓ Pedidos por WhatsApp</li>
                    <li>✓ Importar carta con IA</li>
                    <li className={l.advanced_theme ? '' : 'text-slate-400'}>{l.advanced_theme ? '✓' : '–'} Personalización avanzada</li>
                    <li className={l.promotions ? '' : 'text-slate-400'}>{l.promotions ? '✓' : '–'} Promociones</li>
                    <li className={l.stats ? '' : 'text-slate-400'}>{l.stats ? '✓' : '–'} Estadísticas</li>
                    {l.max_branches > 1 && <li>✓ Hasta {l.max_branches} sucursales</li>}
                  </ul>
                  <Link to={`/registro?plan=${p.code}`} className={`mt-6 rounded-xl px-4 py-3 text-center font-semibold ${featured ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 hover:bg-slate-50'}`}>
                    {trial > 0 ? `Probar ${trial} días gratis` : 'Elegir plan'}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center text-3xl font-bold">Preguntas frecuentes</h2>
        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold">{q}</summary>
              <p className="mt-2 text-sm text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Grupo Underty · <Link to="/login" className="underline">Iniciar sesión</Link>
      </footer>
    </div>
  )
}