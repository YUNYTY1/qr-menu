import { supabase } from './supabase'

const BUCKET = 'restaurant-assets'
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function optimize(file: File, maxSide: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), 'image/webp', 0.82))
}

export type AssetFolder = 'logo' | 'cover' | 'products' | 'categories' | 'promotions'

/** Valida, optimiza (WebP, máx. 1280 px por defecto) y sube la imagen. Devuelve la URL pública. */
export async function uploadImage(restaurantId: string, file: File, folder: AssetFolder, maxSide = 1280): Promise<string> {
  if (!OK_TYPES.includes(file.type)) throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.')
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen supera 10 MB.')
  const blob = await optimize(file, maxSide)
  if (blob.size > 2 * 1024 * 1024) throw new Error('La imagen optimizada supera 2 MB. Prueba con una más liviana.')
  const path = `${restaurantId}/${folder}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
