import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// En celular los campos usan texto de 16 px (evita el zoom automático de iPhone al escribir) y miden al menos 44 px
const base = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100 disabled:text-slate-500 sm:py-2 sm:text-sm'

const QUICK_COLORS = [
  '#ea580c', '#dc2626', '#d97706', '#16a34a',
  '#0284c7', '#4f46e5', '#9333ea', '#db2777',
  '#111827', '#475569', '#fff7ed', '#ffffff',
]

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : 'ea580c'
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60
        break
      case g:
        h = ((b - r) / d + 2) * 60
        break
      case b:
        h = ((r - g) / d + 4) * 60
        break
    }
  }
  return { h: Math.round(h), s, v }
}

function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - c

  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (hue < 60) { r1 = c; g1 = x; b1 = 0 }
  else if (hue < 120) { r1 = x; g1 = c; b1 = 0 }
  else if (hue < 180) { r1 = 0; g1 = c; b1 = x }
  else if (hue < 240) { r1 = 0; g1 = x; b1 = c }
  else if (hue < 300) { r1 = x; g1 = 0; b1 = c }
  else { r1 = c; g1 = 0; b1 = x }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${base} ${p.className ?? ''}`} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={`${base} ${p.className ?? ''}`} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${base} ${p.className ?? ''}`} />

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-[44px] items-center gap-3 sm:min-h-0 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <span className="min-w-0 text-sm text-slate-700">{label}</span>
    </label>
  )
}

export function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const boxRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      const next = hexToHsv(value)
      setHsv((prev) => {
        if (next.s === 0 && prev.s === 0 && Math.abs(next.v - prev.v) < 0.01) return prev
        return next
      })
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function updateSv(clientX: number, clientY: number) {
    const el = padRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const v = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height))
    const next = { ...hsv, s, v }
    setHsv(next)
    onChange(hsvToHex(next.h, next.s, next.v))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateSv(e.clientX, e.clientY)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    updateSv(e.clientX, e.clientY)
  }

  function handleHueChange(newHue: number) {
    const next = { ...hsv, h: newHue }
    setHsv(next)
    onChange(hsvToHex(next.h, next.s, next.v))
  }

  const safePreview = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ea580c'

  return (
    <div ref={boxRef} className="relative min-w-0">
      <Field label={label}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={safePreview}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            title="Selector del sistema"
            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className="h-11 shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
          >
            Paleta
          </button>
          <Input
            value={value}
            disabled={disabled}
            maxLength={7}
            onChange={(e) => onChange(e.target.value)}
            className="min-w-0 font-mono"
          />
        </div>
      </Field>

      {open && !disabled && (
        <div className="z-30 mt-2 w-full max-w-[270px] space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl">
          <div
            ref={padRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            style={{
              backgroundColor: hsvToHex(hsv.h, 1, 1),
              backgroundImage:
                'linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)',
            }}
            className="relative h-36 w-full cursor-crosshair touch-none rounded-xl border border-slate-200"
          >
            <span
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                backgroundColor: safePreview,
              }}
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40"
            />
          </div>

          <input
            type="range"
            min={0}
            max={359}
            value={hsv.h}
            aria-label="Tono de color"
            onChange={(e) => handleHueChange(Number(e.target.value))}
            style={{
              background:
                'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
          />

          <div className="grid grid-cols-6 gap-1.5">
            {QUICK_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  onChange(hex)
                  setHsv(hexToHsv(hex))
                }}
                style={{ backgroundColor: hex }}
                aria-label={`Color ${hex}`}
                className={`h-8 w-full rounded-md border sm:h-6 ${
                  safePreview.toLowerCase() === hex.toLowerCase()
                    ? 'border-slate-900 ring-2 ring-brand-500/40'
                    : 'border-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-0.5 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-700">{safePreview.toUpperCase()}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[36px] rounded-lg bg-slate-900 px-3 py-1 font-semibold text-white hover:bg-slate-800 sm:min-h-0 sm:px-2.5"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
