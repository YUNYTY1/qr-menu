const SMALL = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'a', 'con', 'sin', 'en', 'al', 'por', 'para', 'un', 'una'])
const hasLower = (s: string) => /[a-záéíóúñü]/.test(s)
const hasLetters = (s: string) => /[A-Za-zÁÉÍÓÚÑÜ]/.test(s)

/** Si el texto viene TODO EN MAYÚSCULAS lo muestra en "Tipo Título". Si ya tiene minúsculas, lo respeta. */
export function prettyTitle(s: string): string {
  if (!s || hasLower(s) || !hasLetters(s)) return s
  let first = true
  return s.toLowerCase().split(/(\s+)/).map((w) => {
    if (w === '' || /^\s+$/.test(w)) return w
    const out = !first && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    first = false
    return out
  }).join('')
}

/** Descripciones: si vienen TODO EN MAYÚSCULAS, las pasa a minúsculas con la primera letra en mayúscula. */
export function prettySentence(s: string): string {
  if (!s || hasLower(s) || !hasLetters(s)) return s
  const t = s.toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}