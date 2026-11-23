import { useState } from 'react'

// Tus 3 imágenes de celular completo (mejor PNG/WebP con fondo transparente).
// Guárdalas en public/landing/ y cambia los nombres aquí si son distintos.
const PHONES = [
  { src: '/landing/carta-1.png', alt: 'Parrilla Don Mario' },
  { src: '/landing/carta-2.png', alt: 'Cevichería Mar Azul' },
  { src: '/landing/carta-3.png', alt: 'Café Rincón' },
]

function PhoneSlot({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true)
  return ok ? (
    <img src={src} alt={alt} onError={() => setOk(false)} className="h-full w-full object-contain drop-shadow-2xl" />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-[2rem] border-2 border-dashed border-[#6b4423]/40 p-4 text-center text-xs text-[#6b4423]">
      Pon tu imagen en<br />public{src}
    </div>
  )
}

export function Customize() {
  const [active, setActive] = useState<number | null>(null)
  return (
    <section className="bg-[#f3e8dc] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm font-bold uppercase tracking-wider text-[#6b4423]">Personaliza tu carta</p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">Cada restaurante, con su propia identidad.</h2>
        <p className="mt-4 max-w-md text-lg text-gray-700">Tu logo, tus colores y tus fotos. Pasa el cursor por cada carta y mira cómo cambia.</p>

        <div className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory items-end gap-6 overflow-x-auto px-4 pb-10 pt-6 md:mx-0 md:mt-14 md:flex-wrap md:justify-center md:gap-8 md:overflow-visible md:px-0">
          {PHONES.map((p, i) => (
            <button key={p.src} type="button" aria-label={`Ver ${p.alt}`}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)}
              className="shrink-0 snap-center text-left">
              {/* ESPACIO PARA TU CELULAR: la imagen se ajusta a este recuadro sin deformarse.
                  Para cambiar el tamaño, edita h-[...] y w-[...]. */}
              <div className={`h-[420px] w-[218px] transition-all duration-300 ${active === i ? '-translate-y-3 scale-105' : active !== null ? 'opacity-80' : ''}`}>
                <PhoneSlot src={p.src} alt={p.alt} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
