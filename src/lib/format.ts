export const money = (currency: string, n: number) => `${currency} ${Number(n).toFixed(2)}`

export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

export const todayLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
