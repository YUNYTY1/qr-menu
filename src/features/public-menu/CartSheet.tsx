import { useState } from 'react'
import type { Branch } from '@/types'
import { money } from '@/lib/format'
import { prettyTitle } from '@/lib/text'
import {
  buildOrderMessage,
  cleanPhone,
  googleMapsUrl,
  PAYMENT_LABELS,
  whatsappUrl,
  type DeliveryType,
  type PaymentMethod,
} from '@/lib/wa'
import { supabase } from '@/lib/supabase'
import Icon from '@/components/ui/Icon'
import { useCart } from './cart'
import { Sheet } from './MenuSheets'

const FIELD = 'w-full rounded-xl border border-[var(--card-border)] bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--card-muted)] focus:border-[var(--primary)]'

export function CartSheet({
  restaurantId,
  restaurant,
  cur,
  branches,
  branchId,
  onBranch,
  phone,
  onClose,
  onSent,
}: {
  restaurantId: string
  restaurant: string
  cur: string
  branches: Branch[]
  branchId: string | null
  onBranch: (id: string) => void
  phone: string | null | undefined
  onClose: () => void
  onSent: () => void
}) {
  const cart = useCart()
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape_plin')
  const [cashAmount, setCashAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const branch = branches.find((b) => b.id === branchId)
  const hasValidDelivery = deliveryType === 'pickup' || address.trim().length >= 4 || !!coords
  const hasValidPhone = deliveryType === 'pickup' || customerPhone.replace(/\D/g, '').length >= 7
  const canSend =
    cart.lines.length > 0 &&
    !!phone &&
    cleanPhone(phone).length >= 9 &&
    customerName.trim().length >= 2 &&
    hasValidPhone &&
    hasValidDelivery &&
    !sending

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocError('Tu navegador no soporta ubicación GPS.')
      return
    }
    setLocLoading(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      (err) => {
        setLocLoading(false)
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Puedes escribir tu dirección manualmente.'
            : 'No se pudo obtener tu ubicación exacta.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function send() {
    if (!phone || !canSend) return
    setSending(true)
    setOrderError(null)

    let orderNumber: number | null = null
    let ticketUrl: string | null = null
    let lines: { name: string; price: number; qty: number }[] = cart.lines
    let total = cart.total
    const lat = deliveryType === 'delivery' ? coords?.lat ?? null : null
    const lng = deliveryType === 'delivery' ? coords?.lng ?? null : null
    const locationUrl = deliveryType === 'delivery' ? googleMapsUrl(lat, lng) : null

    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_restaurant: restaurantId,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim() || null,
        p_delivery_type: deliveryType,
        p_address: deliveryType === 'delivery' ? (address.trim() || 'Ubicación por GPS') : null,
        p_reference: deliveryType === 'delivery' ? reference.trim() || null : null,
        p_latitude: lat,
        p_longitude: lng,
        p_payment_method: paymentMethod,
        p_cash_amount: paymentMethod === 'efectivo' ? cashAmount.trim() || null : null,
        p_notes: notes.trim() || null,
        p_items: cart.lines.map((l) => ({ id: l.id, qty: l.qty, kind: l.kind })),
      })

      if (error) {
        if (error.code === 'P0001') {
          setOrderError(error.message)
          setSending(false)
          return
        }
        console.error('No se pudo registrar el pedido:', error)
      } else if (data) {
        orderNumber = data.order_number
        ticketUrl = `${window.location.origin}/pedido/${data.id}`
        lines = (data.items as Array<{ name: string; price: number | string; qty: number | string }>).map((i) => ({
          name: i.name,
          price: Number(i.price),
          qty: Number(i.qty),
        }))
        total = Number(data.total)
      }
    } catch (e) {
      console.error('No se pudo registrar el pedido:', e)
    } finally {
      setSending(false)
    }

    const text = buildOrderMessage({
      restaurant,
      branch: branch?.name,
      orderNumber,
      ticketUrl,
      locationUrl,
      deliveryType,
      customerName,
      customerPhone,
      address,
      reference,
      paymentMethod,
      cashAmount,
      lines,
      total,
      currency: cur,
      notes,
    })

    window.open(whatsappUrl(phone, text), '_blank', 'noopener')
    setTimeout(() => {
      onSent()
    }, 150)
  }

  return (
    <Sheet onClose={onClose} title="Tu pedido">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Tu pedido</h2>
        <button onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
      </div>

      <div className="space-y-4 p-5">
        {cart.lines.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--card-muted)]">Tu pedido está vacío.</p>
        )}

        {cart.lines.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--card-border)] p-1">
              {(
                [
                  { id: 'delivery', label: 'Delivery' },
                  { id: 'pickup', label: 'Recojo en tienda' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDeliveryType(opt.id)
                    if (opt.id === 'pickup') {
                      setCoords(null)
                      setLocError(null)
                    }
                  }}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${deliveryType === opt.id
                      ? 'bg-[var(--btn)] text-[var(--on-btn)] shadow-sm'
                      : 'text-[var(--card-muted)] hover:text-[var(--card-text)]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">
                Detalle de entrega
              </p>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={80}
                placeholder="Nombre y apellido *"
                className={FIELD}
              />

              <input
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                maxLength={20}
                placeholder={deliveryType === 'delivery' ? 'Celular para el delivery *' : 'Celular de contacto (opcional)'}
                className={FIELD}
              />

              {deliveryType === 'delivery' && (
                <>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={160}
                    placeholder={coords ? 'Dirección de entrega (opcional si usas GPS)' : 'Dirección de entrega *'}
                    className={FIELD}
                  />
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={120}
                    placeholder="Referencia (opcional, ej.: frente al parque)"
                    className={FIELD}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--card-border)] px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">
                        {coords ? 'Ubicación exacta adjunta' : 'Ubicación exacta'}
                      </p>
                      <p className="truncate text-[11px] text-[var(--card-muted)]">
                        {coords
                          ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                          : 'Comparte tu pin de GPS para facilitar el envío'}
                      </p>
                    </div>

                    {coords ? (
                      <button
                        type="button"
                        onClick={() => { setCoords(null); setLocError(null) }}
                        className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--card-muted)] hover:text-[var(--card-text)]"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locLoading}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] disabled:opacity-40"
                      >
                        <Icon name="location" className="h-3.5 w-3.5" />
                        {locLoading ? 'Obteniendo...' : 'Usar ubicación'}
                      </button>
                    )}
                  </div>

                  {locError && <p className="text-xs text-red-500">{locError}</p>}
                </>
              )}
            </div>

            {branches.length > 1 && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">Sucursal</span>
                <select
                  value={branchId ?? ''}
                  onChange={(e) => onBranch(e.target.value)}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm"
                >
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}

            <div className="space-y-3 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">
                Resumen del pedido
              </p>
              {cart.lines.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  {l.image_url && (
                    <img
                      src={l.image_url}
                      alt={prettyTitle(l.name)}
                      className="h-11 w-11 shrink-0 rounded-xl object-cover bg-[var(--secondary)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{prettyTitle(l.name)}</p>
                    <p className="text-xs text-[var(--card-muted)]">{money(cur, l.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cart.setQty(l.id, l.qty - 1)} aria-label="Quitar uno" className="h-7 w-7 rounded-full border border-[var(--card-border)] text-base leading-none">−</button>
                    <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                    <button onClick={() => cart.setQty(l.id, l.qty + 1)} aria-label="Agregar uno" className="h-7 w-7 rounded-full border border-[var(--card-border)] text-base leading-none">+</button>
                  </div>
                  <p className="w-16 text-right text-sm font-bold">{money(cur, l.price * l.qty)}</p>
                </div>
              ))}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">Indicaciones (opcional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Ej.: con ají, sin ensalada, timbre malogrado"
                className={FIELD}
              />
            </label>

            <div className="space-y-2.5 border-t border-[var(--card-border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--card-muted)]">
                Método de pago
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['yape_plin', 'efectivo', 'tarjeta'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${paymentMethod === pm
                        ? 'border-[var(--btn)] bg-[var(--btn)] text-[var(--on-btn)]'
                        : 'border-[var(--card-border)] text-[var(--card-text)] hover:border-[var(--primary)]'
                      }`}
                  >
                    {PAYMENT_LABELS[pm]}
                  </button>
                ))}
              </div>

              {paymentMethod === 'efectivo' && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  maxLength={12}
                  placeholder={`¿Con cuánto pagas? (opcional, ej.: 50)`}
                  className={FIELD}
                />
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-4">
          <span className="text-sm text-[var(--card-muted)]">Total estimado</span>
          <span className="text-xl font-bold">{money(cur, cart.total)}</span>
        </div>

        {!phone && <p className="text-xs text-red-500">Este restaurante aún no configuró su WhatsApp.</p>}
        {phone && cart.lines.length > 0 && !canSend && (
          <p className="text-xs text-[var(--card-muted)]">
            Completa tu nombre{deliveryType === 'delivery' ? ', celular y dirección o ubicación GPS' : ''} para enviar el pedido.
          </p>
        )}
        {orderError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{orderError}</p>}

        <button
          onClick={send}
          disabled={!canSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn)] py-3.5 font-semibold text-[var(--on-btn)] disabled:opacity-40"
        >
          <Icon name="chat" /> {sending ? 'Generando pedido...' : 'Enviar pedido por WhatsApp'}
        </button>

        <p className="text-center text-xs text-[var(--card-muted)]">Se abrirá WhatsApp con tu pedido listo. Tú lo envías.</p>
        {cart.lines.length > 0 && (
          <button onClick={cart.clear} className="w-full text-center text-xs text-[var(--card-muted)] underline">
            Vaciar pedido
          </button>
        )}
      </div>
    </Sheet>
  )
}