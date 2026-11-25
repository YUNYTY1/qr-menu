/**
 * Ubicación en el mapa: el dueño puede pegar un enlace de Google Maps o coordenadas ("lat, lng").
 * Solo se aceptan enlaces https de Google Maps (evita enlaces maliciosos como "javascript:").
 */

const COORDS = /^(-?\d{1,2}(?:\.\d+)?)[\s,;]+(-?\d{1,3}(?:\.\d+)?)$/
const GOOGLE_HOST = /^(?:[a-z0-9-]+\.)*google\.(?:com|com\.[a-z]{2}|[a-z]{2})$/

/** Devuelve una URL segura para abrir el mapa, o null si el texto no es válido o está vacío. */
export function parseMapLocation(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null

  const m = v.match(COORDS)
  if (m) {
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }

  let u: URL
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase()
  const short = host === 'maps.app.goo.gl' || (host === 'goo.gl' && u.pathname.startsWith('/maps'))
  const google = GOOGLE_HOST.test(host) && (host.startsWith('maps.') || u.pathname.startsWith('/maps'))
  if (!short && !google) return null
  u.protocol = 'https:'
  return u.toString()
}

/** URL del mapa: usa la ubicación exacta si es válida; si no, busca por dirección (y ciudad). */
export function mapsUrlFor(
  location: string | null | undefined,
  address: string | null | undefined,
  city?: string | null,
): string | undefined {
  const exact = parseMapLocation(location)
  if (exact) return exact
  const q = [address, city].filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined
}