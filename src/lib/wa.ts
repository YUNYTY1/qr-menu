export interface OrderLine {
  name: string
  price: number
  qty: number
}

export type DeliveryType = 'delivery' | 'pickup'
export type PaymentMethod = 'yape_plin' | 'efectivo' | 'tarjeta'

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  yape_plin: 'Yape / Plin',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
}

export function cleanPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  const cc = import.meta.env.VITE_DEFAULT_COUNTRY_CODE ?? '51'
  return cc && d.length <= 9 ? cc + d : d
}

export function googleMapsUrl(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function buildOrderMessage(o: {
  restaurant: string
  branch?: string | null
  orderNumber?: number | null
  ticketUrl?: string | null
  locationUrl?: string | null
  deliveryType: DeliveryType
  customerName: string
  address?: string
  reference?: string
  paymentMethod: PaymentMethod
  cashAmount?: string
  lines: OrderLine[]
  total: number
  currency: string
  notes?: string
}): string {
  const rows = o.lines.map((l) => `• ${l.qty}x ${l.name} — ${o.currency} ${(l.price * l.qty).toFixed(2)}`)

  const deliveryLines =
    o.deliveryType === 'delivery'
      ? [
          `*Entrega:* Delivery`,
          `*Cliente:* ${o.customerName.trim()}`,
          `*Dirección:* ${o.address?.trim() || ''}${o.reference?.trim() ? ` (Ref: ${o.reference.trim()})` : ''}`,
          ...(o.locationUrl ? [`*Ubicación GPS:* ${o.locationUrl}`] : []),
        ]
      : [
          `*Entrega:* Recojo en tienda`,
          `*Cliente:* ${o.customerName.trim()}`,
        ]

  const paymentLine =
    o.paymentMethod === 'efectivo' && o.cashAmount?.trim()
      ? `*Pago:* Efectivo (paga con ${o.currency} ${o.cashAmount.trim()})`
      : `*Pago:* ${PAYMENT_LABELS[o.paymentMethod]}`

  const header = o.orderNumber
    ? `*🧾 NUEVO PEDIDO #${o.orderNumber} — ${o.restaurant}*${o.branch ? ` (${o.branch})` : ''}`
    : `*🧾 NUEVO PEDIDO — ${o.restaurant}*${o.branch ? ` (${o.branch})` : ''}`

  return [
    header,
    '',
    '*Productos:*',
    ...rows,
    '',
    ...deliveryLines,
    paymentLine,
    ...(o.notes?.trim() ? [`*Indicaciones:* ${o.notes.trim()}`] : []),
    '',
    `*Total estimado: ${o.currency} ${o.total.toFixed(2)}*`,
    ...(o.ticketUrl ? ['', '📲 *Ver comanda / ticket:*', o.ticketUrl] : []),
  ].join('\n')
}

export const whatsappUrl = (phone: string, text: string) =>
  `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(text)}`