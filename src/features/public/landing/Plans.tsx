import { Link } from 'react-router-dom'
import type { PublicPlansResponse } from '@/types/billing'

export function Plans({ data, trial }: { data: PublicPlansResponse | null | undefined; trial: number }) {
  const plans = data?.plans ?? []
  return (
    <section id="planes" className="scroll-mt-20 bg-gray-100 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-accent">Planes</p>
        <h2 className="mt-1 font-display text-4xl font-extrabold sm:text-5xl">Planes simples</h2>
        <p className="mt-3 text-gray-600">{trial > 0 ? `Prueba ${trial} días gratis. ` : ''}Cambia de plan cuando quieras.</p>

        <div className={`mx-auto mt-12 grid items-center gap-6 text-left ${plans.length === 3 ? 'max-w-6xl md:grid-cols-3' : 'max-w-4xl md:grid-cols-2'}`}>
          {!data && [0, 1].map((k) => <div key={k} className="h-[480px] animate-pulse rounded-3xl bg-white" />)}
          {plans.map((p, i, all) => {
            const featured = all.length >= 2 && i === 1
            const l = p.limits
            const row = 'border-b border-gray-200 py-2.5 text-sm last:border-0'
            return (
              <div key={p.id} className={`card-pop flex flex-col rounded-3xl border bg-white ${featured ? 'border-accent p-8 shadow-2xl shadow-accent/20' : 'border-gray-200 p-7'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold">{p.name}</h3>
                  {featured && <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">Recomendado</span>}
                </div>
                <p className="mt-6 flex items-baseline gap-1.5"><span className="text-lg font-bold">S/</span><span className="font-display text-6xl font-extrabold">{Number(p.price).toFixed(0)}</span><span className="text-gray-500">/ mes</span></p>
                <ul className="mt-6 flex-1">
                  <li className={row}>{l.max_products < 0 ? 'Productos ilimitados' : `Hasta ${l.max_products} productos`}</li>
                  <li className={row}>Menú digital + código QR</li>
                  <li className={row}>Pedidos por WhatsApp</li>
                  <li className={row}>Importar carta con IA</li>
                  <li className={`${row} ${l.advanced_theme ? '' : 'text-gray-400'}`}>Personalización avanzada</li>
                  <li className={`${row} ${l.promotions ? '' : 'text-gray-400'}`}>Promociones</li>
                  <li className={`${row} ${l.stats ? '' : 'text-gray-400'}`}>Estadísticas</li>
                  {l.max_branches > 1 && <li className={row}>Hasta {l.max_branches} sucursales</li>}
                </ul>
                <Link to={`/registro?plan=${p.code}`} className={`mt-7 rounded-full px-5 py-3.5 text-center font-bold transition ${featured ? 'bg-accent text-white shadow-lg shadow-accent/30 hover:bg-brand-700' : 'border border-gray-900 hover:bg-gray-50'}`}>
                  {trial > 0 ? `Probar ${trial} días gratis` : 'Elegir plan'}
                </Link>
              </div>
            )
          })}
        </div>
        <p className="mt-8 text-sm text-gray-800">{trial > 0 ? `Prueba ${trial} días gratis. ` : ''}Cambia de plan cuando quieras.</p>
      </div>
    </section>
  )
}