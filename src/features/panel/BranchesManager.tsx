import { useState } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { isPhone } from '@/lib/validators'
import { useData } from '@/hooks/useData'
import type { Branch } from '@/types'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, EmptyState, ErrorBox, PageLoader, Pill, useToast } from '@/components/ui/Feedback'
import { Field, Input, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import Icon from '@/components/ui/Icon'
import { useRestaurant } from './RestaurantContext'

const blank = { name: '', address: '', phone: '', whatsapp: '', is_active: true }

export default function BranchesManager() {
  const { restaurant, canWrite, limits, isSuperadmin } = useRestaurant()
  const toast = useToast()
  const { data, loading, error, reload } = useData(
    () => unwrap<Branch[]>(supabase.from('branches').select('*').eq('restaurant_id', restaurant.id).order('created_at')),
    [restaurant.id],
  )
  const [edit, setEdit] = useState<(typeof blank & { id?: string }) | null>(null)
  const [del, setDel] = useState<Branch | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const max = limits.max_branches
  const count = data?.length ?? 0
  const noExtraBranches = max === 0 && !isSuperadmin
  const reached = noExtraBranches || (max >= 0 && count >= max)

  async function save() {
    if (!edit) return
    setErr(null)
    if (!edit.id && reached) return setErr('Has alcanzado el límite de sucursales de tu plan.')
    if (edit.name.trim().length < 2) return setErr('Ingresa el nombre de la sucursal.')
    if (edit.whatsapp && !isPhone(edit.whatsapp)) return setErr('WhatsApp inválido.')
    setBusy(true)
    try {
      const row = {
        name: edit.name.trim(),
        address: edit.address.trim() || null,
        phone: edit.phone.trim() || null,
        whatsapp: edit.whatsapp.trim() || null,
        is_active: edit.is_active,
      }
      if (edit.id) await unwrap(supabase.from('branches').update(row).eq('id', edit.id))
      else await unwrap(supabase.from('branches').insert({ ...row, restaurant_id: restaurant.id }))
      toast('Sucursal guardada')
      setEdit(null)
      reload()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Sucursales</h2>
          {noExtraBranches ? (
            <p className="text-xs text-slate-500">Tu plan incluye 1 local (el principal).</p>
          ) : (
            <p className="text-xs text-slate-500">
              {count} de {max < 0 ? 'ilimitadas' : max} permitidas por tu plan
              {isSuperadmin ? ' · Modo Superadmin' : ''}
            </p>
          )}
        </div>
        {!noExtraBranches && (
          <Button size="sm" disabled={!canWrite || reached} onClick={() => { setErr(null); setEdit({ ...blank }) }}>
            <Icon name="plus" className="h-4 w-4" /> Nueva sucursal
          </Button>
        )}
      </div>

      {noExtraBranches && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600">
          Las sucursales adicionales están disponibles desde el plan <strong>Profesional</strong>. Si tienes más de una sede y quieres recibir pedidos por sucursal, mejora tu plan.
        </div>
      )}

      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!noExtraBranches && data && data.length === 0 && (
        <EmptyState title="Sin sucursales" hint="Agrega sedes adicionales si manejas más de un local." />
      )}

      <div className="divide-y divide-slate-100">
        {data?.map((b) => (
          <div key={b.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {b.name} {!b.is_active && <Pill>Inactiva</Pill>}
              </p>
              <p className="truncate text-sm text-slate-500">{[b.address, b.whatsapp].filter(Boolean).join(' · ')}</p>
            </div>
            <IconButton
              label="Editar"
              disabled={!canWrite}
              onClick={() => {
                setErr(null)
                setEdit({ name: b.name, address: b.address ?? '', phone: b.phone ?? '', whatsapp: b.whatsapp ?? '', is_active: b.is_active, id: b.id })
              }}
            >
              <Icon name="edit" />
            </IconButton>
            <IconButton label="Eliminar" disabled={!canWrite} onClick={() => setDel(b)}>
              <Icon name="trash" />
            </IconButton>
          </div>
        ))}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Editar sucursal' : 'Nueva sucursal'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button loading={busy} onClick={save}>Guardar</Button>
          </>
        }
      >
        {edit && (
          <>
            <Field label="Nombre">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={120} />
            </Field>
            <Field label="Dirección">
              <Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono">
                <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp" hint="Recibe los pedidos de esta sucursal">
                <Input value={edit.whatsapp} onChange={(e) => setEdit({ ...edit, whatsapp: e.target.value })} />
              </Field>
            </div>
            <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Sucursal activa (visible en el menú)" />
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title="Eliminar sucursal"
        message={`¿Eliminar la sucursal “${del?.name}”? Esta acción no se puede deshacer.`}
        onCancel={() => setDel(null)}
        onConfirm={async () => {
          try {
            await unwrap(supabase.from('branches').delete().eq('id', del!.id))
            toast('Sucursal eliminada')
            setDel(null)
            reload()
          } catch (e) {
            toast(errMsg(e), 'error')
            setDel(null)
          }
        }}
      />
    </Card>
  )
}