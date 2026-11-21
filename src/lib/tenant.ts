const BASE = (import.meta.env.VITE_BASE_DOMAIN || '').trim().toLowerCase()
const RESERVED = ['www', 'app', 'admin', 'api']

/** Devuelve el slug del restaurante si la página se abre desde su subdominio (o con ?r=slug). */
export function getTenantSlug(): string | null {
  const host = window.location.hostname.toLowerCase()
  if (BASE && host.endsWith('.' + BASE)) {
    const sub = host.slice(0, -(BASE.length + 1))
    if (sub && !sub.includes('.') && !RESERVED.includes(sub)) return sub
  }
  const q = new URLSearchParams(window.location.search).get('r')
  return q ? q.toLowerCase() : null
}

/** URL pública del menú (la misma que codifica el QR). */
export function publicUrl(slug: string): string {
  if (BASE) return `https://${slug}.${BASE}`
  return `${window.location.origin}/m/${slug}`
}
