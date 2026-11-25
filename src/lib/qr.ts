import QRCode from 'qrcode'

export const qrDataUrl = (text: string, width = 512) =>
  QRCode.toDataURL(text.trim(), { width, margin: 2, errorCorrectionLevel: 'M' })

/** Cartel imprimible A4 (150 dpi) con el QR del menú. */
export async function posterBlob(url: string, name: string, color: string): Promise<Blob> {
  const cleanUrl = url.trim()
  const W = 1240, H = 1754
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, 300)
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  let size = 96
  do { ctx.font = `700 ${size}px Inter, Arial, sans-serif`; size -= 4 } while (ctx.measureText(name).width > W - 160 && size > 32)
  ctx.fillText(name, W / 2, 150)
  ctx.fillStyle = '#111827'
  ctx.font = '600 64px Inter, Arial, sans-serif'
  ctx.fillText('Escanea y mira nuestra carta', W / 2, 480)
  const img = new Image()
  img.src = await qrDataUrl(cleanUrl, 900)
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
  ctx.drawImage(img, (W - 800) / 2, 600, 800, 800)
  ctx.fillStyle = '#6b7280'
  ctx.font = '400 34px Inter, Arial, sans-serif'
  ctx.fillText(cleanUrl, W / 2, 1520)
  ctx.font = '400 28px Inter, Arial, sans-serif'
  ctx.fillText('Pide por WhatsApp desde tu celular', W / 2, 1600)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar el cartel'))), 'image/png'))
}

export function downloadBlob(blob: Blob | string, filename: string) {
  const href = typeof blob === 'string' ? blob : URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  if (typeof blob !== 'string') setTimeout(() => URL.revokeObjectURL(href), 1000)
}