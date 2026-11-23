import { useState } from 'react'

// Agrega aquí tus 5 imágenes nuevas (8 en total) en public/landing/
const PHONES = [
  { src: '/landing/carta-1.png', alt: 'Cevichería Underty' },
  { src: '/landing/carta-2.png', alt: 'Parrilla y Platos de Fondo' },
  { src: '/landing/carta-3.png', alt: 'Minimarket' },
  { src: '/landing/carta-4.png', alt: 'Negocio 4' },
  { src: '/landing/carta-5.png', alt: 'Negocio 5' },
  { src: '/landing/carta-6.png', alt: 'Negocio 6' },
  { src: '/landing/carta-7.png', alt: 'Negocio 7' },
  { src: '/landing/carta-8.png', alt: 'Negocio 8' },
]

function PhoneSlot({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true)
  return ok ? (
    <img
      src={src}
      alt={alt}
      onError={() => setOk(false)}
      className="h-full w-full object-contain drop-shadow-2xl"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-[2rem] border-2 border-dashed border-[#6b4423]/40 p-4 text-center text-xs text-[#6b4423]">
      Pon tu imagen en
      <br />
      public{src}
    </div>
  )
}

export function Customize() {
  const [active, setActive] = useState<number | null>(null)
  const items = [...PHONES, ...PHONES]

  return (
    <section className="overflow-hidden bg-[#f3e8dc] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 lg:max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-wider text-[#6b4423]">
          Personaliza tu catálogo
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
          Cada negocio, con su propia identidad.
        </h2>
        <p className="mt-4 max-w-md text-lg text-gray-700">
          Tu logo, tus colores y tus fotos. Pasa el cursor por cada carta y mira cómo cambia.
        </p>
      </div>

      <div className="group relative mt-10 overflow-hidden pb-10 pt-6 md:mt-14">
        <div
          className="flex w-max items-end gap-6 px-4 animate-[marquee-left_36s_linear_infinite] group-hover:[animation-play-state:paused] lg:gap-10"
        >
          {items.map((p, idx) => {
            const realIndex = idx % PHONES.length
            const isHovered = active === idx

            return (
              <button
                key={`${p.src}-${idx}`}
                type="button"
                aria-label={`Ver ${p.alt}`}
                onMouseEnter={() => {
                  setActive(idx)
                }}
                onMouseLeave={() => {
                  setActive(null)
                }}
                onFocus={() => {
                  setActive(idx)
                }}
                onBlur={() => {
                  setActive(null)
                }}
                onClick={() => {
                  setActive(idx)
                }}
                className="shrink-0 text-left"
              >
                <div
                  className={`h-[420px] w-[218px] transition-all duration-300 lg:h-[560px] lg:w-[290px] ${
                    isHovered
                      ? '-translate-y-3 scale-105'
                      : active !== null
                        ? 'opacity-80'
                        : ''
                  }`}
                >
                  <PhoneSlot src={p.src} alt={`${p.alt} #${realIndex + 1}`} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}