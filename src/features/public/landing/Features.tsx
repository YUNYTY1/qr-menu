import { I, QrArt, useReveal } from './shared'

export function Features() {
  const [ref, shown] = useReveal<HTMLDivElement>()
  const base = 'card-pop rounded-3xl border border-gray-200 bg-white p-6'
  const ico = 'mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-accent'
  const bars = [30, 52, 42, 72, 62, 90]
  return (
    <section id="funcionalidades" className="scroll-mt-20 bg-cream py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Todo lo que necesita tu carta, en un solo lugar.</h2>
        <div ref={ref} className="mt-12 grid gap-5 md:grid-cols-6">
          <div className={`${base} md:col-span-3`}>
            <span className={ico}><I n="qr" /></span>
            <h3 className="text-xl font-extrabold">Código QR listo para imprimir</h3>
            <p className="mt-1 text-gray-600">Descarga tu QR y el cartel A4 para mesas y mostrador.</p>
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gray-100 p-4">
              <QrArt className="h-24 w-24 text-gray-600" />
              <div className="rounded-lg bg-white px-3 py-2 text-xs"><p className="font-bold">Cartel A4</p><p className="text-gray-500">Mesas y mostrador</p></div>
            </div>
          </div>
          <div className="card-pop rounded-3xl bg-gray-900 p-6 text-white md:col-span-3">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><I n="chat" /></span>
            <h3 className="text-xl font-extrabold">Pedidos directos por WhatsApp</h3>
            <p className="mt-1 text-gray-300">El cliente arma su pedido y te lo envía con un toque. Sin comisiones por venta.</p>
            <p className="mt-5 inline-block rounded-lg rounded-bl-none bg-[#dcf8c6] px-3 py-2 text-xs font-medium text-gray-900">Pedido: 2 Lomo a la parrilla · S/ 76</p>
          </div>
          <div className={`${base} md:col-span-2`}>
            <span className={ico}><I n="palette" /></span>
            <h3 className="text-xl font-extrabold">Con tu marca</h3>
            <p className="mt-1 text-gray-600">Tu logo, tus colores y tus fotos.</p>
            <div className="mt-5 flex gap-3">{['#f25c26', '#111827', '#16a34a', '#7c3aed'].map((c) => <span key={c} className="h-9 w-9 rounded-full transition hover:scale-110" style={{ background: c }} />)}</div>
          </div>
          <div className={`${base} md:col-span-2`}>
            <span className={ico}><I n="list" /></span>
            <h3 className="text-xl font-extrabold">Categorías y productos</h3>
            <p className="mt-1 text-gray-600">Cambia precios o marca “agotado” en segundos.</p>
            <div className="mt-5 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-gray-100 px-3 py-2.5 font-bold"><span>Ceviche</span><span>S/ 32</span></div>
              <div className="flex justify-between rounded-lg bg-gray-100 px-3 py-2.5 text-gray-500"><span className="font-bold line-through">Anticucho</span><span>Agotado</span></div>
            </div>
          </div>
          <div className={`${base} md:col-span-2`}>
            <span className={ico}><I n="tag" /></span>
            <h3 className="text-xl font-extrabold">Promociones y destacados</h3>
            <p className="mt-1 text-gray-600">Resalta tus mejores platos del día.</p>
            <span className="mt-5 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">Promo del día</span>
          </div>
          <div className={`${base} md:col-span-3`}>
            <span className={ico}><I n="sparkle" /></span>
            <h3 className="text-xl font-extrabold">Importación de cartas con IA</h3>
            <p className="mt-1 text-gray-600">Sube una foto o PDF y la inteligencia artificial arma tu menú.</p>
            <p className="mt-5 rounded-full bg-gray-100 px-4 py-2.5 text-xs font-bold">carta.pdf → <span className="text-accent">12 productos detectados</span></p>
          </div>
          <div className={`${base} md:col-span-3`}>
            <span className={ico}><I n="chart" /></span>
            <h3 className="text-xl font-extrabold">Estadísticas</h3>
            <p className="mt-1 text-gray-600">Mira qué platos llaman más la atención.</p>
            <div className="mt-6 flex h-24 items-end gap-3">
              {bars.map((h, i) => (
                <span key={i} className="flex-1 origin-bottom rounded-t-md transition-transform duration-700"
                  style={{ height: `${h}%`, background: `rgba(242,92,38,${0.35 + i * 0.13})`, transform: shown ? 'scaleY(1)' : 'scaleY(0)', transitionDelay: `${i * 90}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
