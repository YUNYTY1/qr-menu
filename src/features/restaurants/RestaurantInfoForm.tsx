import { useState, type FormEvent } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isPhone, isSlug } from '@/lib/validators'
import { publicUrl } from '@/lib/tenant'
import type { HourRow, Restaurant, Socials } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, useToast } from '@/components/ui/Feedback'
import { Field, Input, Textarea } from '@/components/ui/Form'

/** Datos comerciales del restaurante. El slug (dirección pública) solo lo edita el superadmin. */
export default function RestaurantInfoForm({ restaurant, canEditSlug, disabled, onSaved }: {
  restaurant: Restaurant; canEditSlug?: boolean; disabled?: boolean; onSaved: () => void
}) {
  const toast = useToast()
  const [f, setF] = useState({
    name: restaurant.name, slug: restaurant.slug, description: restaurant.description ?? '', address: restaurant.address ?? '',
    phone: restaurant.phone ?? '', whatsapp: restaurant.whatsapp ?? '', currency: restaurant.currency,
  })
  const [hours, setHours] = useState<HourRow[]>(restaurant.hours ?? [])
  const [socials, setSocials] = useState<Socials>(restaurant.socials ?? {})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  async function save(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (f.name.trim().length < 2) return setErr('El nombre es obligatorio.')
    if (canEditSlug && !isSlug(f.slug)) return setErr('La dirección solo admite minúsculas, números y guiones (3 a 40 caracteres).')
    if (f.whatsapp && !isPhone(f.whatsapp)) return setErr('El WhatsApp no parece un número válido.')
    if (f.phone && !isPhone(f.phone)) return setErr('El teléfono no parece válido.')
    setBusy(true)
    try {
      const patch: Record<string, unknown> = {
        name: f.name.trim(), description: f.description.trim() || null, address: f.address.trim() || null,
        phone: f.phone.trim() || null, whatsapp: f.whatsapp.trim() || null, currency: f.currency.trim() || 'S/',
        hours: hours.filter((h) => h.label.trim() || h.value.trim()), socials,
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
        <Field label="Descripción corta"><Textarea value={f.description} onChange={set('description')} disabled={disabled} maxLength={500} /></Field>
        <Field label="Dirección"><Input value={f.address} onChange={set('address')} disabled={disabled} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono"><Input value={f.phone} onChange={set('phone')} disabled={disabled} inputMode="tel" /></Field>
          <Field label="WhatsApp para pedidos" hint="Número con o sin código de país"><Input value={f.whatsapp} onChange={set('whatsapp')} disabled={disabled} inputMode="tel" /></Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Horarios</h2>
          <Button size="sm" variant="secondary" disabled={disabled || hours.length >= 8} onClick={() => setHours([...hours, { label: '', value: '' }])}>Agregar horario</Button>
        </div>
        {hours.length === 0 && <p className="text-sm text-slate-500">Sin horarios. Ej.: “Lunes a Domingo — 12:00 a 22:00”.</p>}
        {hours.map((h, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Días" value={h.label} disabled={disabled} onChange={(e) => setHours(hours.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
            <Input placeholder="Horario" value={h.value} disabled={disabled} onChange={(e) => setHours(hours.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
            <Button variant="ghost" disabled={disabled} onClick={() => setHours(hours.filter((_, k) => k !== i))}>Quitar</Button>
          </div>
        ))}
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
