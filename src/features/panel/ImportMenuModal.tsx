import { useRef, useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, unwrap } from '@/lib/supabase'
import { errMsg } from '@/lib/errors'
import { parsePrice } from '@/lib/validators'
import type { Category } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { Spinner, useToast } from '@/components/ui/Feedback'

interface Row { include: boolean; name: string; description: string; price: string }
interface Cat { name: string; products: Row[] }
interface FileItem { name: string; mime_type: string; data: string }

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

async function fileToItem(file: File): Promise<FileItem> {
  if (file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error(`“${file.name}” pesa más de 5 MB.`)
    const buf = new Uint8Array(await file.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return { name: file.name, mime_type: 'application/pdf', data: btoa(bin) }
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`“${file.name}”: formato no permitido.`)
  // Se reduce a 1600 px para que la subida sea rápida y la IA lea bien el texto
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/jpeg', 0.85)
  return { name: file.name, mime_type: 'image/jpeg', data: url.split(',')[1] }
}

export default function ImportMenuModal({ restaurantId, currency, existing, slots, onClose, onDone }: {
  restaurantId: string
  currency: string
  existing: Category[]
  slots: number // productos que aún caben en el plan (-1 = ilimitado)
  onClose: () => void
  onDone: () => void
}) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'pick' | 'loading' | 'review'>('pick')
  const [files, setFiles] = useState<FileItem[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function pick(list: FileList | null) {
    if (!list) return
    setErr(null)
    try {
      const items: FileItem[] = []
      for (const f of Array.from(list)) items.push(await fileToItem(f))
      const all = [...files, ...items].slice(0, 4)
      setFiles(all)
    } catch (e) { setErr(errMsg(e)) }
    if (inputRef.current) inputRef.current.value = ''
  }

  async function analyze() {
    setErr(null); setStep('loading')
    try {
      const { data, error } = await supabase.functions.invoke('import-menu-ai', {
        body: { restaurant_id: restaurantId, files: files.map(({ mime_type, data }) => ({ mime_type, data })) },
      })
      if (error) {
        let msg = errMsg(error)
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg } catch { /* */ } }
        throw new Error(msg)
      }
      const out = (data?.categories ?? []) as { name: string; products: { name: string; description: string; price: number }[] }[]
      setCats(out.map((c) => ({
        name: c.name,
        products: c.products.map((p) => ({ include: true, name: p.name, description: p.description ?? '', price: String(p.price) })),
      })))
      setStep('review')
    } catch (e) { setErr(errMsg(e)); setStep('pick') }
  }

  const setRow = (ci: number, ri: number, patch: Partial<Row>) =>
    setCats((cs) => cs.map((c, i) => (i !== ci ? c : { ...c, products: c.products.map((r, j) => (j === ri ? { ...r, ...patch } : r)) })))
  const setCatName = (ci: number, name: string) => setCats((cs) => cs.map((c, i) => (i === ci ? { ...c, name } : c)))
  const setAll = (v: boolean) => setCats((cs) => cs.map((c) => ({ ...c, products: c.products.map((r) => ({ ...r, include: v })) })))

  const selected = cats.reduce((n, c) => n + c.products.filter((r) => r.include).length, 0)
  const overLimit = slots >= 0 && selected > slots

  async function confirm() {
    setErr(null)
    for (const c of cats) {
      const chosen = c.products.filter((r) => r.include)
      if (chosen.length === 0) continue
      if (!c.name.trim()) return setErr('Hay una categoría sin nombre.')
      for (const r of chosen) {
        if (!r.name.trim()) return setErr(`Hay un producto sin nombre en “${c.name}”.`)
        if (parsePrice(r.price) === null) return setErr(`Precio inválido en “${r.name}”.`)
      }
    }
    if (selected === 0) return setErr('Selecciona al menos un producto.')
    setSaving(true)
    try {
      const byName = new Map(existing.map((c) => [norm(c.name), c.id]))
      let order = existing.reduce((m, c) => Math.max(m, c.sort_order), -1) + 1
      for (const c of cats) {
        const chosen = c.products.filter((r) => r.include)
        if (chosen.length === 0) continue
        let catId = byName.get(norm(c.name))
        if (!catId) {
          const created = await unwrap<{ id: string }>(
            supabase.from('categories').insert({ restaurant_id: restaurantId, name: c.name.trim().slice(0, 80), sort_order: order++ }).select('id').single())
          catId = created.id
          byName.set(norm(c.name), catId)
        }
        await unwrap(supabase.from('products').insert(chosen.map((r) => ({
          restaurant_id: restaurantId, category_id: catId, name: r.name.trim().slice(0, 120),
          description: r.description.trim().slice(0, 600) || null, price: parsePrice(r.price)!,
        }))))
      }
      toast(`${selected} productos importados`)
      onDone()
    } catch (e) { setErr(errMsg(e)) } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Importar carta con IA" size="lg"
      footer={step === 'review' ? (
        <>
          <Button variant="secondary" onClick={() => { setStep('pick'); setErr(null) }}>Volver</Button>
          <Button loading={saving} disabled={selected === 0 || overLimit} onClick={confirm}>Importar {selected} productos</Button>
        </>
      ) : step === 'pick' ? (
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={files.length === 0} onClick={analyze}>Analizar con IA</Button>
        </>
      ) : undefined}>

      {step === 'pick' && (
        <>
          <p className="text-sm text-slate-600">Sube una foto o PDF de tu carta (hasta 4 archivos). La IA lee las categorías, productos y precios, y tú revisas todo antes de guardar.</p>
          <input ref={inputRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pick(e.target.files)} />
          <button onClick={() => inputRef.current?.click()} disabled={files.length >= 4}
            className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 p-8 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-700 disabled:opacity-50">
            <span className="font-semibold">Elegir fotos o PDF de la carta</span>
            <span className="text-xs">JPG, PNG, WEBP o PDF (máx. 5 MB por PDF)</span>
          </button>
          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, k) => k !== i))} className="ml-3 text-xs font-semibold text-red-600">Quitar</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">Funciona mejor con fotos nítidas, de frente y con buena luz. Los archivos se envían a un servicio de IA para leer el texto y no se guardan.</p>
        </>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
          <Spinner className="h-8 w-8" />
          <p className="text-sm">La IA está leyendo tu carta… puede tardar unos segundos.</p>
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">Revisa y corrige. Desmarca lo que no quieras importar. Los precios en <span className="font-semibold text-amber-700">ámbar</span> están en {currency} 0.00 y conviene verificarlos.</p>
            <div className="flex gap-3 text-xs font-semibold text-brand-700">
              <button onClick={() => setAll(true)}>Marcar todo</button>
              <button onClick={() => setAll(false)}>Desmarcar todo</button>
            </div>
          </div>
          {overLimit && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Tu plan solo permite {slots} producto(s) más. Desmarca {selected - slots} para continuar.</p>}
          <div className="space-y-5">
            {cats.map((c, ci) => {
              const exists = existing.some((e) => norm(e.name) === norm(c.name))
              return (
                <div key={ci} className="rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-3">
                    <Input value={c.name} onChange={(e) => setCatName(ci, e.target.value)} className="max-w-xs font-semibold" aria-label="Nombre de la categoría" />
                    <span className="text-xs text-slate-500">{exists ? 'Se agregará a la categoría existente' : 'Categoría nueva'}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {c.products.map((r, ri) => {
                      const zero = parsePrice(r.price) === 0
                      return (
                        <div key={ri} className={`grid gap-2 p-3 sm:grid-cols-[auto_1fr_110px] ${r.include ? '' : 'opacity-40'}`}>
                          <input type="checkbox" checked={r.include} onChange={(e) => setRow(ci, ri, { include: e.target.checked })} className="mt-2.5 h-4 w-4 accent-orange-600" aria-label="Importar este producto" />
                          <div className="space-y-1.5">
                            <Input value={r.name} onChange={(e) => setRow(ci, ri, { name: e.target.value })} maxLength={120} aria-label="Nombre" />
                            <Input value={r.description} onChange={(e) => setRow(ci, ri, { description: e.target.value })} maxLength={600} placeholder="Descripción (opcional)" aria-label="Descripción" className="!text-xs" />
                          </div>
                          <Input value={r.price} inputMode="decimal" onChange={(e) => setRow(ci, ri, { price: e.target.value })} aria-label="Precio"
                            className={zero || parsePrice(r.price) === null ? '!border-amber-400 !bg-amber-50' : ''} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      {err && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
    </Modal>
  )
}