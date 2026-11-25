import { useState, type FormEvent } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isPhone, isSlug } from '@/lib/validators'
import { publicUrl } from '@/lib/tenant'
import { DAY_ORDER, dayName, slotsToHours } from '@/lib/schedule'
import { parseMapLocation } from '@/lib/maps'
import type { Restaurant, ScheduleSlot, Socials } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, useToast } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DAY_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
const TIMEZONES: [string, string][] = [
  ['America/Lima', 'Perú (Lima)'], ['America/Bogota', 'Colombia (Bogotá)'], ['America/Guayaquil', 'Ecuador (Guayaquil)'],
  ['America/La_Paz', 'Bolivia (La Paz)'], ['America/Santiago', 'Chile (Santiago)'], ['America/Argentina/Buenos_Aires', 'Argentina (Buenos Aires)'],
  ['America/Mexico_City', 'México (Ciudad de México)'],
]
const NEW_SLOT: ScheduleSlot = { days: [1, 2, 3, 4, 5], open: '12:00', close: '22:00' }

/** Datos comerciales del restaurante. El slug (dirección pública) solo lo edita el superadmin. */
export default function RestaurantInfoForm({ restaurant, canEditSlug, disabled, onSaved }: {
  restaurant: Restaurant; canEditSlug?: boolean; disabled?: boolean; onSaved: () => void
}) {
  const toast = useToast()
  const [f, setF] = useState({
    name: restaurant.name, slug: restaurant.slug, description: restaurant.description ?? '', address: restaurant.address ?? '',
    map_location: restaurant.map_location ?? '',
    phone: restaurant.phone ?? '', whatsapp: restaurant.whatsapp ?? '', currency: restaurant.currency,
    cuisine: restaurant.cuisine ?? '', city: restaurant.city ?? '', delivery_time: restaurant.delivery_time ?? '',
    timezone: restaurant.timezone ?? 'America/Lima',
  })
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(restaurant.schedule ?? [])
  const [socials, setSocials] = useState<Socials>(restaurant.socials ?? {})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const setSlot = (i: number, patch: Partial<ScheduleSlot>) => setSchedule((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  const legacyHours = restaurant.hours ?? []
  const hadSchedule = (restaurant.schedule?.length ?? 0) > 0
  const zones = TIMEZONES.some(([v]) => v === f.timezone) ? TIMEZONES : [...TIMEZONES, [f.timezone, f.timezone] as [string, string]]
  const mapPreview = parseMapLocation(f.map_location)

  async function save(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (f.name.trim().length < 2) return setErr('El nombre es obligatorio.')
    if (canEditSlug && !isSlug(f.slug)) return setErr('La dirección solo admite minúsculas, números y guiones (3 a 40 caracteres).')
    if (f.whatsapp && !isPhone(f.whatsapp)) return setErr('El WhatsApp no parece un número válido.')
    if (f.phone && !isPhone(f.phone)) return setErr('El teléfono no parece válido.')
    if (f.map_location.trim() && !parseMapLocation(f.map_location)) {
      return setErr('La ubicación debe ser un enlace de Google Maps o coordenadas (ej.: -12.0464, -77.0428).')
    }
    for (const s of schedule) {
      if (s.days.length === 0) return setErr('Elige al menos un día en cada horario.')
      if (!TIME.test(s.open) || !TIME.test(s.close)) return setErr('Completa la hora de apertura y de cierre de cada horario.')
      if (s.open === s.close) return setErr('La hora de apertura y la de cierre no pueden ser iguales.')
    }
    const cleaned: ScheduleSlot[] = schedule.map((s) => ({ days: Array.from(new Set(s.days)).sort((a, b) => a - b), open: s.open, close: s.close }))
    // El texto que ve el cliente se genera desde las franjas. Sin franjas: se conserva el texto anterior,
    // salvo que el dueño haya borrado horarios que antes tenía.
    const hours = cleaned.length > 0 ? slotsToHours(cleaned) : hadSchedule ? [] : legacyHours
    setBusy(true)
    try {
      const patch: Record<string, unknown> = {
        name: f.name.trim(), description: f.description.trim() || null, address: f.address.trim() || null,
        map_location: f.map_location.trim() || null,
        phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null, currency: f.currency.trim() || 'S/',
        cuisine: f.cuisine.trim() || null, city: f.city.trim() || null, delivery_time: f.delivery_time.trim() || null,
        timezone: f.timezone, schedule: cleaned, hours, socials,
      }
      if (canEditSlug) patch.slug = f.slug.trim()
      await unwrap(supabase.from('restaurants').update(patch).eq('id', restaurant.id))
      toast('Información guardada')
      onSaved()
    } catch (e2) { setErr(errMsg(e2)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="font-semibold">Datos del restaurante</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial"><Input value={f.name} onChange={set('name')} disabled={disabled} maxLength={120} /></Field>
          <Field label="Moneda" hint="Ej.: S/, $, €"><Input value={f.currency} onChange={set('currency')} disabled={disabled} maxLength={5} /></Field>
        </div>
        {canEditSlug && (
          <Field label="Dirección pública (subdominio)" hint={`Menú: ${publicUrl(f.slug || 'slug')}. Si cambia, hay que regenerar el QR.`}>
            <Input value={f.slug} onChange={(e) => setF((x) => ({ ...x, slug: e.target.value.toLowerCase() }))} maxLength={40} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo de comida (opcional)" hint="Ej.: Comida colombiana"><Input value={f.cuisine} onChange={set('cuisine')} disabled={disabled} maxLength={60} /></Field>
          <Field label="Ciudad (opcional)" hint="Ej.: Ibagué"><Input value={f.city} onChange={set('city')} disabled={disabled} maxLength={60} /></Field>
          <Field label="Tiempo de entrega (opcional)" hint="Ej.: 35-40 min"><Input value={f.delivery_time} onChange={set('delivery_time')} disabled={disabled} maxLength={20} /></Field>
        </div>
        <Field label="Descripción corta" hint="Se muestra en la tarjeta de tu menú."><Textarea value={f.description} onChange={set('description')} disabled={disabled} maxLength={500} /></Field>
        <Field label="Dirección"><Input value={f.address} onChange={set('address')} disabled={disabled} /></Field>
        <Field label="Ubicación en el mapa (opcional)" hint="Pega el enlace de Google Maps (botón Compartir) o las coordenadas, ej.: -12.0464, -77.0428. Si lo dejas vacío, el mapa se busca por la dirección.">
          <Input value={f.map_location} onChange={set('map_location')} disabled={disabled} maxLength={300} placeholder="https://maps.app.goo.gl/… o -12.0464, -77.0428" />
        </Field>
        {mapPreview && (
          <a href={mapPreview} target="_blank" rel="noreferrer" className="-mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline">
            Probar ubicación ↗
          </a>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono"><Input value={f.phone} onChange={set('phone')} disabled={disabled} inputMode="tel" /></Field>
          <Field label="WhatsApp para pedidos" hint="Número con o sin código de país"><Input value={f.whatsapp} onChange={set('whatsapp')} disabled={disabled} inputMode="tel" /></Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Horarios</h2>
            <p className="text-xs text-slate-500">Con tus horarios, el menú muestra si estás Abierto o Cerrado, y los pedidos se bloquean fuera de horario.</p>
          </div>
          <Button size="sm" variant="secondary" disabled={disabled || schedule.length >= 8} onClick={() => setSchedule([...schedule, { ...NEW_SLOT }])}>Agregar horario</Button>
        </div>

        {schedule.length === 0 && legacyHours.length > 0 && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Tu horario actual está escrito como texto: {legacyHours.map((h) => `${h.label}: ${h.value}`).join(' · ')}. Agrega un horario aquí para activar “Abierto / Cerrado” y el bloqueo de pedidos fuera de horario; reemplazará ese texto al guardar.
          </p>
        )}
        {schedule.length === 0 && legacyHours.length === 0 && (
          <p className="text-sm text-slate-500">Sin horarios. Usa “Agregar horario”, por ejemplo de lunes a viernes de 12:00 a 22:00.</p>
        )}

        {schedule.map((s, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días de la semana">
              {DAY_ORDER.map((d) => {
                const on = s.days.includes(d)
                return (
                  <button key={d} type="button" disabled={disabled} aria-pressed={on} title={dayName(d)} aria-label={dayName(d)}
                    onClick={() => setSlot(i, { days: on ? s.days.filter((x) => x !== d) : [...s.days, d] })}
                    className={`h-9 w-9 rounded-full text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-brand-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    {DAY_SHORT[d]}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Abre"><Input type="time" value={s.open} disabled={disabled} onChange={(e) => setSlot(i, { open: e.target.value })} /></Field>
              <Field label="Cierra"><Input type="time" value={s.close} disabled={disabled} onChange={(e) => setSlot(i, { close: e.target.value })} /></Field>
              <Button variant="ghost" disabled={disabled} onClick={() => setSchedule(schedule.filter((_, k) => k !== i))}>Quitar</Button>
            </div>
          </div>
        ))}

        {schedule.length > 0 && slotsToHours(schedule).length > 0 && (
          <p className="text-xs text-slate-500">
            Tus clientes verán: {slotsToHours(schedule).map((h) => `${h.label}: ${h.value}`).join(' · ')}. Si cierras después de medianoche (ej. de 18:00 a 02:00), pon el día en que abres.
          </p>
        )}

        <Field label="Zona horaria" hint="Se usa para saber si estás abierto según la hora de tu ciudad.">
          <Select value={f.timezone} disabled={disabled} onChange={set('timezone')}>
            {zones.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Select>
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Redes sociales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['instagram', 'facebook', 'tiktok', 'website'] as const).map((k) => (
            <Field key={k} label={k === 'website' ? 'Sitio web' : k.charAt(0).toUpperCase() + k.slice(1)}>
              <Input value={socials[k] ?? ''} disabled={disabled} placeholder="https://" onChange={(e) => setSocials({ ...socials, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Card>

      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <Button type="submit" loading={busy} disabled={disabled}>Guardar cambios</Button>
    </form>
  )
}