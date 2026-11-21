import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { fmtDate, slugify } from '@/lib/format'
import { effStatus, one } from '@/lib/status'
import { isPhone, isSlug } from '@/lib/validators'
import { publicUrl } from '@/lib/tenant'
import type { Plan } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ErrorBox, PageHeader, PageLoader } from '@/components/ui/Feedback'
import { Field, Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import Icon from '@/components/ui/Icon'

export default function RestaurantsPage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useData(async () => {
    const [rows, plans] = await Promise.all([
      unwrap<any[]>(supabase.from('restaurants').select('id,name,slug,created_at, subscriptions(status,end_date,plans(name))').order('created_at', { ascending: false })),
      unwrap<Plan[]>(supabase.from('plans').select('*').eq('is_active', true).order('price')),
    ])
    return { rows, plans }
  }, [])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', slug: '', plan: '', whatsapp: '', phone: '', address: '' })
  const [slugTouched, setSlugTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const rows = (data?.rows ?? []).filter((r) => !q || `${r.name} ${r.slug}`.toLowerCase().includes(q.toLowerCase()))

  async function create() {
    setErr(null)
    if (f.name.trim().length < 2) return setErr('Ingresa el nombre comercial.')
    if (!isSlug(f.slug)) return setErr('La dirección solo admite minúsculas, números y guiones (3 a 40 caracteres).')
    if (!f.plan) return setErr('Selecciona un plan.')
    if (f.whatsapp && !isPhone(f.whatsapp)) return setErr('WhatsApp inválido.')
    setBusy(true)
    try {
      const id = await unwrap<string>(supabase.rpc('create_restaurant', {
        p_name: f.name, p_slug: f.slug, p_plan: f.plan, p_whatsapp: f.whatsapp || null, p_phone: f.phone || null, p_address: f.address || null,
      }))
      navigate(`/superadmin/restaurants/${id}`)
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Restaurantes" subtitle="Clientes de Underty Menu."
        actions={<Button onClick={() => { setErr(null); setF({ name: '', slug: '', plan: data?.plans[0]?.id ?? '', whatsapp: '', phone: '', address: '' }); setSlugTouched(false); setOpen(true) }}><Icon name="plus" className="h-4 w-4" /> Nuevo restaurante</Button>} />
      <div className="mb-4 max-w-sm"><Input placeholder="Buscar por nombre o dirección…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && rows.length === 0 && <EmptyState title="Sin restaurantes" hint="Crea el primero con “Nuevo restaurante”." />}
      {rows.length > 0 && (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Restaurante</th><th>Plan</th><th>Estado</th><th>Vence</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const sub = one<any>(r.subscriptions)
                const plan = one<any>(sub?.plans)
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/superadmin/restaurants/${r.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
                      <p className="text-xs text-slate-500">{r.slug}</p>
                    </td>
                    <td>{plan?.name ?? '—'}</td>
                    <td><Badge status={effStatus(sub)} /></td>
                    <td>{fmtDate(sub?.end_date)}</td>
                    <td className="space-x-3 pr-4 text-right">
                      <Link to={`/panel/${r.id}`} className="text-xs font-semibold text-brand-700 hover:underline">Configurar menú</Link>
                      <a href={publicUrl(r.slug)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-500 hover:underline">Ver ↗</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo restaurante"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={busy} onClick={create}>Crear restaurante</Button></>}>
        <Field label="Nombre comercial"><Input value={f.name} autoFocus maxLength={120}
          onChange={(e) => setF({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) })} /></Field>
        <Field label="Dirección pública (subdominio)" hint={`Menú: ${publicUrl(f.slug || 'nombre')}`}>
          <Input value={f.slug} maxLength={40} onChange={(e) => { setSlugTouched(true); setF({ ...f, slug: e.target.value.toLowerCase() }) }} />
        </Field>
        <Field label="Plan">
          <Select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>
            <option value="">Selecciona…</option>
            {data?.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp (opcional)"><Input value={f.whatsapp} inputMode="tel" onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
          <Field label="Teléfono (opcional)"><Input value={f.phone} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Dirección (opcional)"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </Modal>
    </div>
  )
}
