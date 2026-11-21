export const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim())
export const isSlug = (s: string) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s)
export const isPhone = (s: string) => { const d = s.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15 }
export const parsePrice = (s: string): number | null => {
  const n = Number(s.replace(',', '.').trim())
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) / 100 : null
}
