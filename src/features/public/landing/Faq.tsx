import { useState } from 'react'
import { Link } from 'react-router-dom'
import { I } from './shared'

export const FAQ = [
  ['¿Necesito saber de tecnología?', 'No. Subes la foto de tu carta y la inteligencia artificial arma tus categorías y productos. Tú solo revisas y corriges.'],
  ['¿Cómo reciben los pedidos mis clientes?', 'Escanean el QR, eligen sus platos y se abre WhatsApp con el pedido listo hacia tu número. Tú lo recibes como cualquier mensaje.'],
  ['¿Qué pasa si no pago un mes?', 'Tu menú muestra “servicio temporalmente no disponible”. Tus datos no se borran: al renovar todo vuelve a la normalidad.'],
  ['¿Cómo pago?', 'Con Yape, Plin o transferencia, y también con tarjeta cuando esté habilitado. Tu plan se activa apenas se confirma el pago.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mx-auto max-w-3xl px-4">
      <h2 className="text-center font-display text-4xl font-extrabold sm:text-5xl">Preguntas frecuentes</h2>
      <div className="mt-8 rounded-3xl border border-gray-200 bg-white px-5">
        {FAQ.map(([q, a], i) => {
          const isOpen = open === i
          return (
            <div key={q} className="border-b border-gray-200 last:border-0">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left font-bold">
                {q}
                <I n="chevron" className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden"><p className="pb-5 text-sm text-gray-600">{a}</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Cta({ trial }: { trial: number }) {
  return (
    <div className="mx-auto mt-14 max-w-5xl sm:mt-20 px-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-accent px-6 py-14 text-center sm:py-20 text-white">
        <span className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/15" />
        <span className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-black/15" />
        <div className="relative">
          <h2 className="mx-auto max-w-xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">Tu restaurante merece una carta digital a su altura.</h2>
          <p className="mx-auto mt-4 max-w-md text-lg">Empieza hoy a digitalizar tu negocio y recibe pedidos directamente por WhatsApp.</p>
          <Link to="/registro" className="mt-8 inline-block rounded-full bg-gray-900 px-8 py-4 font-bold shadow-xl transition hover:-translate-y-0.5">Crear mi carta gratis</Link>
          <p className="mt-4 text-xs font-semibold">{trial > 0 ? `${trial} días gratis · ` : ''}Sin tarjeta de crédito</p>
        </div>
      </div>
    </div>
  )
}