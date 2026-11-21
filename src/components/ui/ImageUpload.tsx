import { useRef, useState } from 'react'
import { uploadImage, type AssetFolder } from '@/lib/storage'
import { errMsg } from '@/lib/errors'
import { Button } from './Button'
import Icon from './Icon'

export default function ImageUpload({ restaurantId, folder, value, onChange, label, maxSide = 1280, disabled, round }: {
  restaurantId: string; folder: AssetFolder; value: string | null; onChange: (url: string | null) => void
  label: string; maxSide?: number; disabled?: boolean; round?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function pick(file?: File) {
    if (!file) return
    setBusy(true); setErr(null)
    try { onChange(await uploadImage(restaurantId, file, folder, maxSide)) }
    catch (e) { setErr(errMsg(e)) }
    finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 text-slate-400 ${round ? 'rounded-full' : 'rounded-xl'}`}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="h-8 w-8" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <Button size="sm" variant="secondary" loading={busy} disabled={disabled} onClick={() => ref.current?.click()}>{value ? 'Cambiar' : 'Subir imagen'}</Button>
          {value && !disabled && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Quitar</Button>}
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <p className="mt-1 text-xs text-slate-500">JPG, PNG o WEBP. Se optimiza automáticamente.</p>
    </div>
  )
}
