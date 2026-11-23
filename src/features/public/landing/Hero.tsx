import { useState } from 'react'
import { Link } from 'react-router-dom'
import { I, Reveal, QrArt } from './shared'
import celularImg from './celular.png'

export function Hero({ trial }: { trial: number }) {
  const [phoneOk, setPhoneOk] = useState(true)

  return (
    <section id="top" className="overflow-x-clip bg-gradient-to-b from-cream to-orange-50/60">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-14">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-accent" /> Tu restaurante, más digital que nunca
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 font-display text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl xl:text-7xl">
              Tu carta digital con QR y{' '}
              <span className="text-accent underline decoration-accent/40 decoration-[3px] underline-offset-[10px]">
                pedidos directos por WhatsApp.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-gray-600">
              Digitaliza tu carta, muestra tus platos y permite que tus clientes realicen pedidos desde su celular. Sin complicaciones y sin comisiones por venta.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/registro"
                className="w-full rounded-full bg-accent px-8 py-4 text-center text-lg font-bold text-white shadow-xl shadow-accent/30 transition hover:-translate-y-0.5 hover:bg-brand-700 sm:w-auto"
              >
                Crear mi carta gratis
              </Link>
              <a
                href="#como-funciona"
                className="w-full rounded-full border border-gray-300 bg-white px-8 py-4 text-center text-lg font-semibold text-gray-900 transition hover:bg-gray-50 sm:w-auto"
              >
                Ver cómo funciona
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium text-gray-700">
              <li className="flex items-center gap-1.5">
                <I n="check" className="h-4 w-4 text-accent" />
                {trial > 0 ? `${trial} días gratis · Sin tarjeta de crédito` : 'Sin tarjeta de crédito'}
              </li>
              <li className="flex items-center gap-1.5">
                <I n="check" className="h-4 w-4 text-accent" />
                Sin comisiones por venta
              </li>
            </ul>
          </Reveal>
        </div>

        {/* Contenedor con margen horizontal en pantallas medianas/grandes para que los flotantes respiren afuera */}
        <Reveal delay={250} className="relative mx-auto sm:px-10">
          <div className="relative h-[560px] w-[272px] sm:h-[610px] sm:w-[300px]">
            {phoneOk ? (
              <img
                src={celularImg}
                alt="Demo de carta digital"
                onError={() => setPhoneOk(false)}
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[2.4rem] border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No se pudo cargar la imagen del celular
              </div>
            )}

            {/* QR flotante hacia la izquierda */}
            <div className="pointer-events-none absolute -left-3 top-8 z-20 animate-float rounded-2xl bg-white p-3 text-center shadow-xl sm:-left-20 sm:top-10">
              <QrArt className="h-[88px] w-[88px] text-gray-900" />
              <p className="mt-1 text-[10px] font-extrabold tracking-wider">ESCANÉAME</p>
            </div>

            {/* Notificación movida hacia afuera (abajo/derecha sin invadir la pantalla) */}
            <div className="pointer-events-none absolute -bottom-4 -right-2 z-20 flex animate-toast items-center gap-3 rounded-2xl bg-gray-900 p-3.5 pr-5 text-white shadow-2xl sm:-right-24 sm:bottom-12">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent">
                <I n="bell" />
              </span>
              <div className="text-sm leading-tight">
                <p className="font-bold">¡Pedido recibido!</p>
                <p className="mt-0.5 text-gray-200">
                  Nuevo pedido por<br />WhatsApp
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}