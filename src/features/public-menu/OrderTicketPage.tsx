import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { money } from '@/lib/format'
import { prettyTitle } from '@/lib/text'
import { cleanPhone, googleMapsUrl, PAYMENT_LABELS, type DeliveryType, type PaymentMethod } from '@/lib/wa'

interface OrderRow {
  id: string
  order_number: number
  restaurant_id?: string
  customer_name: string
  customer_phone: string | null
  delivery_type: DeliveryType
  address: string | null
  reference: string | null
  latitude: number | null
  longitude: number | null
  payment_method: PaymentMethod
  cash_amount: string | null
  notes: string | null
  items: Array<{ id: string; name: string; price: number; qty: number; image_url?: string | null }>
  total: number
  created_at: string
  restaurant?: { name: string; currency: string | null; logo_url: string | null } | null
  restaurants?: { name: string; currency: string | null; logo_url: string | null } | null
}

export default function OrderTicketPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)

      const { data, error } = await supabase.rpc('get_order_ticket', { p_id: id })

      if (cancelled) return

      if (error || !data) {
        if (error) console.error('Error cargando comanda:', error)
        setOrder(null)
        setLoading(false)
        return
      }

      const row = data as OrderRow
      setOrder({
        ...row,
        restaurant: row.restaurant ?? row.restaurants ?? null,
      })
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3e8dc] text-sm text-stone-600">Cargando comanda...</div>
  }

  if (!order) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3e8dc] p-4 text-center text-sm text-stone-700">No se encontró este pedido.</div>
  }

  const restInfo = order.restaurant ?? order.restaurants ?? null
  const cur = restInfo?.currency || 'S/'
  const mapsLink = order.delivery_type === 'delivery' ? googleMapsUrl(order.latitude, order.longitude) : null
  const rawPhone = order.customer_phone?.trim() || ''
  const telDigits = rawPhone.replace(/\D/g, '')
  const waClientPhone = rawPhone ? cleanPhone(rawPhone) : ''
  const dateStr = new Date(order.created_at).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-[#f3e8dc] px-4 py-8 text-stone-900">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="bg-stone-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold">
              PEDIDO #{order.order_number}
            </span>
            <span className="text-xs text-stone-300">{dateStr}</span>
          </div>
          <h1 className="mt-2 text-xl font-bold">{restInfo?.name || 'Comanda digital'}</h1>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl bg-stone-50 p-4 text-sm space-y-1.5">
            <p><span className="font-semibold">Modalidad:</span> {order.delivery_type === 'delivery' ? 'Delivery' : 'Recojo en tienda'}</p>
            <p><span className="font-semibold">Cliente:</span> {order.customer_name}</p>
            {rawPhone && (
              <p><span className="font-semibold">Teléfono:</span> {rawPhone}</p>
            )}
            {order.delivery_type === 'delivery' && order.address && (
              <p>
                <span className="font-semibold">Dirección:</span> {order.address}
                {order.reference ? ` (Ref: ${order.reference})` : ''}
              </p>
            )}

            {(mapsLink || telDigits) && (
              <div className="flex flex-wrap gap-2 pt-2">
                {mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                  >
                    Ver ubicación en Maps
                  </a>
                )}
                {telDigits && (
                  <a
                    href={`tel:${rawPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    Llamar al cliente
                  </a>
                )}
                {waClientPhone && (
                  <a
                    href={`https://wa.me/${waClientPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100"
                  >
                    WhatsApp cliente
                  </a>
                )}
              </div>
            )}

            <p className="pt-1">
              <span className="font-semibold">Pago:</span> {PAYMENT_LABELS[order.payment_method]}
              {order.payment_method === 'efectivo' && order.cash_amount ? ` (paga con ${cur} ${order.cash_amount})` : ''}
            </p>
            {order.notes && <p><span className="font-semibold">Indicaciones:</span> {order.notes}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Detalle</p>
            {order.items.map((item, i) => (
              <div key={`${item.id}-${i}`} className="flex items-center gap-3 border-b border-stone-100 pb-3 last:border-none">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-xl object-cover bg-stone-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.qty}x {prettyTitle(item.name)}</p>
                  <p className="text-xs text-stone-500">{money(cur, item.price)} c/u</p>
                </div>
                <p className="text-sm font-bold">{money(cur, item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-stone-200 pt-4">
            <span className="text-sm font-medium text-stone-500">Total estimado</span>
            <span className="text-2xl font-extrabold">{money(cur, order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}