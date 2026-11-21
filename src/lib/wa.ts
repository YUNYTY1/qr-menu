export interface OrderLine { name: string; price: number; qty: number }

export function cleanPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  const cc = import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '51'
  return cc && d.length <= 9 ? cc + d : d
}

export function buildOrderMessage(o: {
  restaurant: string; branch?: string | null; lines: OrderLine[]; total: number; currency: string; notes?: string
}): string {
  const rows = o.lines.map((l) => `• ${l.qty} x ${l.name} — ${o.currency} ${(l.price * l.qty).toFixed(2)}`)
  return [
    `Hola, quiero hacer un pedido en *${o.restaurant}*${o.branch ? ` (${o.branch})` : ''}:`,
    '',
    ...rows,
    '',
    `*Total estimado: ${o.currency} ${o.total.toFixed(2)}*`,
    ...(o.notes?.trim() ? ['', `Indicaciones: ${o.notes.trim()}`] : []),
  ].join('\n')
}

export const whatsappUrl = (phone: string, text: string) =>
  `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`
