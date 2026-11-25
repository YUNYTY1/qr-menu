import { I, Food, FOOD, Reveal } from './shared'
import mascotaImg from './mascota-underty.png'

export function AiImport() {
  const rows = [
    ['Ceviche clásico ........ 32', FOOD.ceviche],
    ['Pollo a la brasa ...... 18', FOOD.pollo],
    ['Lomo a la parrilla .... 38', FOOD.lomo],
    ['Chicha morada ......... 8', null],
  ] as const

  return (
    <section className="overflow-x-clip bg-gray-900 py-14 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-accent">
              <I n="sparkle" className="h-4 w-4" /> Novedad · Inteligencia artificial
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              Tu carta en PDF. Tu menú digital en segundos.
            </h2>
            <p className="mt-5 max-w-xl text-lg text-gray-300">
              Sube una fotografía o PDF de tu carta y nuestra inteligencia artificial identifica categorías, productos y precios. Revisa, corrige y publica.
            </p>
          </div>

          <Reveal delay={150} className="flex justify-center lg:justify-end">
            <img
              src={mascotaImg}
              alt="Mascota UNDERTY cocinando"
              className="h-56 w-auto object-contain drop-shadow-2xl sm:h-72 lg:h-80 xl:h-[22rem]"
            />
          </Reveal>
        </div>

        <div className="mt-10 flex flex-col items-center gap-6 md:flex-row">
          <div className="card-pop relative w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 md:flex-1">
            <p className="flex items-center gap-2 text-sm text-gray-300">
              <I n="file" className="h-4 w-4" /> carta-restaurante.pdf
            </p>
            <div className="mt-4 space-y-3 font-display text-sm text-gray-400">
              {rows.map(([t]) => <p key={t}>{t}</p>)}
            </div>
            <div className="pointer-events-none absolute inset-x-0 h-12 animate-scan bg-gradient-to-b from-transparent via-accent/40 to-transparent">
              <span className="absolute inset-x-0 top-1/2 h-0.5 bg-accent" />
            </div>
          </div>

          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40">
            <I n="sparkle" className="h-7 w-7" />
          </span>

          <div className="card-pop w-full space-y-2.5 rounded-3xl bg-cream p-3 text-gray-900 md:flex-1">
            {[FOOD.ceviche, FOOD.pollo, FOOD.lomo].map((it, i) => (
              <Reveal key={it.n} delay={i * 180}>
                <div className="flex items-center gap-3 rounded-2xl bg-white p-2 pr-4">
                  <Food item={it} className="h-14 w-14 rounded-lg text-xl" />
                  <span className="flex-1 font-bold">{it.n}</span>
                  <span className="font-extrabold text-accent">{it.p}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}