import { useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { isEmail } from '@/lib/validators'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageLoader, useToast } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import Icon from '@/components/ui/Icon'

interface Row { user_id: string; role: string; profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }

export default function UsersTab({ restaurantId }: { restaurantId: string }) {
  const toast = useToast()
  const { data, loading, error, reload } = useData(
    () => unwrap<Row[]>(supabase.from('restaurant_users').select('user_id, role, profiles(full_name,email)').eq('restaurant_id', restaurantId)), [restaurantId])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ full_name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [del, setDel] = useState<Row | null>(null)

  async function create() {
    setErr(null)
    if (!isEmail(f.email)) return setErr('Correo inválido.')
    if (f.password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.')
    setBusy(true)
    try {
      const { error } = await supabase.functions.invoke('create-restaurant-user', { body: { restaurant_id: restaurantId, ...f, role: 'owner' } })
      if (error) {
        let msg = errMsg(error)
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg } catch { /* */ } }
        throw new Error(msg)
      }
      toast('Acceso creado'); setOpen(false); reload()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  const prof = (r: Row) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-semibold">Accesos del restaurante</h2><p className="text-xs text-slate-500">Cada restaurante solo ve sus propios datos.</p></div>
        <Button size="sm" onClick={() => { setErr(null); setF({ full_name: '', email: '', password: '' }); setOpen(true) }}><Icon name="plus" className="h-4 w-4" /> Crear acceso</Button>
      </div>
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="Sin accesos" hint="Crea usuario y contraseña para que el cliente administre su menú." />}
      <div className="divide-y divide-slate-100">
        {data?.map((r) => (
          <div key={r.user_id} className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon name="users" className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{prof(r)?.full_name || prof(r)?.email}</p><p className="truncate text-xs text-slate-500">{prof(r)?.email}</p></div>
            <IconButton label="Quitar acceso" onClick={() => setDel(r)}><Icon name="trash" /></IconButton>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Crear acceso"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={busy} onClick={create}>Crear</Button></>}>
        <Field label="Nombre (opcional)"><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Correo"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Contraseña inicial" hint="Mínimo 8 caracteres. El cliente puede cambiarla con “Olvidé mi contraseña”."><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </Modal>
            <ConfirmDialog open={!!del} title="Quitar acceso" confirmLabel="Quitar" message={del ? `${prof(del)?.email ?? ''} dejará de poder entrar a este restaurante. La cuenta no se elimina.` : ''}
        onCancel={() => setDel(null)}
        onConfirm={async () => { try { await unwrap(supabase.from('restaurant_users').delete().eq('restaurant_id', restaurantId).eq('user_id', del!.user_id)); toast('Acceso removido'); reload() } catch (e) { toast(errMsg(e), 'error') } setDel(null) }} />
    </Card>
  )
}
