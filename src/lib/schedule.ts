import type { HourRow, ScheduleSlot } from '@/types'

/** Orden de la semana para mostrar: lunes primero. 0 = domingo ... 6 = sábado (como getDay() de JavaScript). */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const dayName = (d: number) => NAMES[d] ?? ''

/** [1,2,3,4,5] → "Lunes a Viernes" · [6,0] → "Sábado y Domingo" · [1,3] → "Lunes, Miércoles" */
export function daysLabel(days: number[]): string {
  const set = new Set(days)
  const seq = DAY_ORDER.filter((d) => set.has(d))
  if (seq.length === 7) return 'Todos los días'
  const pos = seq.map((d) => DAY_ORDER.indexOf(d))
  const parts: string[] = []
  let i = 0
  while (i < seq.length) {
    let j = i
    while (j + 1 < seq.length && pos[j + 1] === pos[j] + 1) j++
    const len = j - i + 1
    const a = NAMES[seq[i]]
    const b = NAMES[seq[j]]
    parts.push(len >= 3 ? `${a} a ${b}` : len === 2 ? `${a} y ${b}` : a)
    i = j + 1
  }
  return parts.join(', ')
}

/** Texto que ve el cliente, generado desde las franjas: "Lunes a Viernes: 12:00 a 22:00". */
export function slotsToHours(slots: ScheduleSlot[]): HourRow[] {
  return slots
    .filter((s) => s.days.length > 0 && TIME.test(s.open) && TIME.test(s.close))
    .map((s) => ({ label: daysLabel(s.days), value: `${s.open} a ${s.close}` }))
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function localParts(tz: string, now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { day: WD[get('weekday')], min: (Number(get('hour')) % 24) * 60 + Number(get('minute')) }
}

/**
 * true = abierto ahora, false = cerrado, null = no hay horario estructurado (no se muestra etiqueta).
 * Usa la zona horaria del restaurante, no la del celular del cliente.
 * Soporta cierres después de medianoche (ej. 18:00 a 02:00).
 */
export function isOpenNow(slots: ScheduleSlot[] | null | undefined, tz: string | null | undefined, now: Date = new Date()): boolean | null {
  const valid = (slots ?? []).filter((s) => s.days?.length > 0 && TIME.test(s.open) && TIME.test(s.close) && s.open !== s.close)
  if (valid.length === 0) return null
  let lp: { day: number; min: number }
  try { lp = localParts(tz || 'America/Lima', now) } catch {
    try { lp = localParts('America/Lima', now) } catch { return null }
  }
  if (lp.day === undefined || Number.isNaN(lp.min)) return null
  const prev = (lp.day + 6) % 7
  return valid.some((s) => {
    const o = toMin(s.open)
    const c = toMin(s.close)
    if (c > o) return s.days.includes(lp.day) && lp.min >= o && lp.min < c
    return (s.days.includes(lp.day) && lp.min >= o) || (s.days.includes(prev) && lp.min < c)
  })
}