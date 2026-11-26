import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import Icon from '@/components/ui/Icon'

/** WhatsApp de soporte de UNDERTY (con código de país, sin + ni espacios). Se puede cambiar con VITE_SUPPORT_WHATSAPP. */
const SUPPORT_NUMBER = (import.meta.env.VITE_SUPPORT_WHATSAPP || '51989715909').replace(/\D/g, '')

const SECTIONS: Record<string, string> = {
  products: 'Productos',
  categories: 'Categorías',
  promotions: 'Promociones',
  theme: 'Apariencia',
  qr: 'Código QR',
  stats: 'Estadísticas',
  info: 'Mi restaurante',
  plan: 'Mi plan',
}

/**
 * Botón flotante de soporte para el dueño del restaurante.
 * Abre WhatsApp con un mensaje ya escrito que incluye el restaurante y la sección donde está.
 * Se dibuja en document.body (portal) para que ningún contenedor del panel lo recorte o lo mueva.
 */
export default function SupportButton({ restaurantName }: { restaurantName?: string }) {
  const { pathname } = useLocation()
  const [hint, setHint] = useState(true)

  // El texto "¿Necesitas ayuda?" se muestra unos segundos al entrar y luego solo al pasar el cursor
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 7000)
    return () => clearTimeout(t)
  }, [])

  const section = SECTIONS[pathname.split('/').filter(Boolean).pop() ?? '']
  const message = [
    'Hola, necesito ayuda con mi carta en Underty Menu.',
    restaurantName ? `Restaurante: ${restaurantName}` : null,
    section ? `Estoy en: ${section}` : null,
  ].filter(Boolean).join('\n')
  const href = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`

  const label = hint
    ? 'max-w-[200px] px-3 opacity-100'
    : 'max-w-0 px-0 opacity-0 group-hover:max-w-[200px] group-hover:px-3 group-hover:opacity-100 group-focus-visible:max-w-[200px] group-focus-visible:px-3 group-focus-visible:opacity-100'

  return createPortal(
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Pedir ayuda por WhatsApp a Underty"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2"
    >
      <span className={`overflow-hidden whitespace-nowrap rounded-full bg-slate-900 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-300 ${label}`}>
        ¿Necesitas ayuda?
      </span>
      <span className="relative flex h-14 w-14 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-40" aria-hidden="true" />
        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-900/30 transition duration-200 group-hover:scale-110 group-active:scale-95">
          <Icon name="whatsapp" className="h-7 w-7" />
        </span>
      </span>
    </a>,
    document.body,
  )
}