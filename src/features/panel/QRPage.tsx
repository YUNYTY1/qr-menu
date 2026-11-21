import { useEffect, useState } from 'react'
import { publicUrl } from '@/lib/tenant'
import { downloadBlob, posterBlob, qrDataUrl } from '@/lib/qr'
import { errMsg } from '@/lib/errors'
import { useData } from '@/hooks/useData'
import { supabase, unwrap } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card, PageHeader, Spinner, useToast } from '@/components/ui/Feedback'
import Icon from '@/components/ui/Icon'
import { useRestaurant } from './RestaurantContext'

export default function QRPage() {
  const { restaurant } = useRestaurant()
  const toast = useToast()
  const url = publicUrl(restaurant.slug)
  const [img, setImg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { data: primary } = useData(async () => {
    const t = await unwrap<{ primary_color: string } | null>(supabase.from('restaurant_themes').select('primary_color').eq('restaurant_id', restaurant.id).maybeSingle())
    return t?.primary_color ?? '#ea580c'
  }, [restaurant.id])

  async function generate() { setImg(null); setImg(await qrDataUrl(url, 640)) }
  useEffect(() => { generate().catch((e) => toast(errMsg(e), 'error')) }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  async function png() { try { downloadBlob(await qrDataUrl(url, 1200), `qr-${restaurant.slug}.png`) } catch (e) { toast(errMsg(e), 'error') } }
  async function poster() {
    setBusy(true)
    try { downloadBlob(await posterBlob(url, restaurant.name, primary ?? '#ea580c'), `cartel-qr-${restaurant.slug}.png`) }
    catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Código QR" subtitle="Imprímelo en tus mesas, mostrador o redes sociales." />
      <Card className="mx-auto max-w-md space-y-5 text-center">
        <div className="mx-auto flex h-72 w-72 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3">
          {img ? <img src={img} alt={`Código QR del menú de ${restaurant.name}`} className="h-full w-full" /> : <Spinner className="h-8 w-8 text-slate-400" />}
        </div>
        <div>
          <p className="text-xs text-slate-500">El QR apunta a:</p>
          <a href={url} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-brand-700 hover:underline">{url}</a>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={png}><Icon name="download" className="h-4 w-4" /> Descargar PNG</Button>
          <Button variant="secondary" loading={busy} onClick={poster}><Icon name="download" className="h-4 w-4" /> Cartel imprimible (A4)</Button>
          <Button variant="ghost" onClick={() => generate().then(() => toast('QR regenerado'))}>Regenerar</Button>
        </div>
        <p className="text-xs text-slate-500">El QR se genera desde la dirección pública. Si Grupo Underty cambia esa dirección, vuelve a descargarlo.</p>
      </Card>
    </div>
  )
}
