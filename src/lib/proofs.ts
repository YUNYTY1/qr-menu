import { supabase } from './supabase'

const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Optimiza y sube el comprobante de pago al bucket PRIVADO. Devuelve la ruta (no una URL pública). */
export async function uploadProof(restaurantId: string, file: File): Promise<string> {
  if (!OK_TYPES.includes(file.type)) throw new Error('El comprobante debe ser una imagen JPG, PNG o WEBP (captura de pantalla).')
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen supera 12 MB.')
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale))
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const blob: Blob = await new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/webp', 0.85))
  if (blob.size > 3 * 1024 * 1024) throw new Error('La imagen optimizada supera 3 MB.')
  const path = `${restaurantId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, blob, { contentType: 'image/webp' })
  if (error) throw error
  return path
}

export async function proofUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}