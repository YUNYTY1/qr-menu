import { I, QrArt, useReveal } from './shared'

export function Steps() {
  const [ref, shown] = useReveal<HTMLDivElement>()
  const items = ['Ceviche clásico · S/ 32', 'Pollo a la brasa · S/ 18', 'Chicha morada · S/ 8']
  const card = 'card-pop rounded-3xl border border-orange-100 bg-cream p-7'
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold uppercase tracking-wider text-accent">Así funciona Underty Menu</p>
        <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Tres pasos y tu carta está lista.</h2>
        <div ref={ref} className="mt-12 grid gap-6 md:grid-cols-3">
          {/* 01 */}
          <div className={card}>
            <div className="flex items-start justify-between"><span className="font-display text-5xl font-extrabold text-accent">01</span><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white"><I n="upload" /></span></div>
            <div className="mt-5 h-[190px] space-y-2.5 rounded-2xl bg-gray-100 p-4">
              {items.map((t, i) => (
                <div key={t} style={{ transitionDelay: `${i * 220}ms` }}
                  className={`rounded-lg border border-dashed border-accent/50 bg-white px-3 py-2.5 text-sm font-medium transition-all duration-500 ${shown ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>{t}</div>
              ))}
            </div>
            <h3 className="mt-6 text-xl font-extrabold">Digitaliza tu carta</h3>
            <p className="mt-1 text-gray-600">Sube tu carta o registra tus productos.</p>
          </div>
          {/* 02 */}
          <div className={`${card} shadow-xl md:-mt-2`}>
            <div className="flex items-start justify-between"><span className="font-display text-5xl font-extrabold text-accent">02</span><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white"><I n="qr" /></span></div>
            <div className="mt-5 flex h-[190px] items-center justify-center rounded-2xl bg-gray-100">
              <div className={`rounded-2xl bg-white p-3 shadow-lg transition-all duration-700 ${shown ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}><QrArt className="h-[130px] w-[130px] text-gray-900" /></div>
            </div>
            <h3 className="mt-6 text-xl font-extrabold">Comparte tu código QR</h3>
            <p className="mt-1 text-gray-600">Tus clientes podrán acceder a tu menú desde cualquier celular.</p>
          </div>
          {/* 03 */}
          <div className={card}>
            <div className="flex items-start justify-between"><span className="font-display text-5xl font-extrabold text-accent">03</span><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white"><I n="chat" /></span></div>
            <div className="mt-5 flex h-[190px] flex-col justify-center gap-2.5 rounded-2xl bg-gray-100 p-4 text-sm">
              <p style={{ transitionDelay: '300ms' }} className={`ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 transition-all duration-500 ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>Hola, quiero pedir: 1 Ceviche clásico, 2 Chicha morada</p>
              <p style={{ transitionDelay: '1100ms' }} className={`max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 transition-all duration-500 ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>¡Recibido! Ya lo preparamos</p>
            </div>
            <h3 className="mt-6 text-xl font-extrabold">Recibe pedidos por WhatsApp</h3>
            <p className="mt-1 text-gray-600">Tus clientes seleccionan sus productos y te envían el pedido directamente.</p>
          </div>
        </div>
      </div>
    </section>
  )
}