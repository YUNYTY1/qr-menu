import type { CSSProperties } from 'react'
import type { BgGradient, BgMode, BgTexture, Theme } from '@/types'
import { readableOn } from './color'

export const TEMPLATES = [
  { id: 'clasico', label: 'Clásico' }, { id: 'moderno', label: 'Moderno' },
  { id: 'oscuro', label: 'Oscuro' }, { id: 'elegante', label: 'Elegante' },
] as const
export const FONTS = ['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Lora'] as const
export const CARD_STYLES = [
  { id: 'redondeada', label: 'Redondeada' }, { id: 'plana', label: 'Plana' }, { id: 'sombra', label: 'Con sombra' },
] as const
export const LAYOUTS = [
  { id: 'horizontal', label: 'Tarjetas horizontales' },
  { id: 'cuadricula', label: 'Cuadrícula 2 columnas' },
  { id: 'compacta', label: 'Cuadrícula 3 columnas' },
  { id: 'simple', label: 'Cuadrícula simple' },
  { id: 'lista', label: 'Lista con miniatura' },
  { id: 'grande', label: 'Tarjetas grandes' },
  { id: 'carrusel', label: 'Carrusel horizontal' },
  { id: 'texto', label: 'Lista solo texto' },
] as const

export const BG_MODES: { id: BgMode; label: string }[] = [
  { id: 'plantilla', label: 'Según la plantilla' }, { id: 'color', label: 'Color sólido' },
  { id: 'degradado', label: 'Degradado' }, { id: 'textura', label: 'Textura sutil' },
]

export interface GradientDef { id: BgGradient; label: string; from: string; to: string; dark: boolean }
export const GRADIENTS: GradientDef[] = [
  { id: 'atardecer', label: 'Atardecer', from: '#fff7ed', to: '#fdba74', dark: false },
  { id: 'oceano', label: 'Océano', from: '#f0f9ff', to: '#7dd3fc', dark: false },
  { id: 'menta', label: 'Menta', from: '#f0fdf4', to: '#86efac', dark: false },
  { id: 'rosa', label: 'Rosa', from: '#fff1f2', to: '#fda4af', dark: false },
  { id: 'arena', label: 'Arena', from: '#fefce8', to: '#e7d9b0', dark: false },
  { id: 'noche', label: 'Noche', from: '#0f172a', to: '#334155', dark: true },
  { id: 'bosque', label: 'Bosque', from: '#052e16', to: '#166534', dark: true },
  { id: 'vino', label: 'Vino', from: '#4c0519', to: '#9f1239', dark: true },
  { id: 'uva', label: 'Uva', from: '#2e1065', to: '#6d28d9', dark: true },
]
export const gradientCss = (g: GradientDef) => `linear-gradient(180deg, ${g.from} 0%, ${g.to} 100%)`

export const TEXTURES: { id: BgTexture; label: string }[] = [
  { id: 'puntos', label: 'Puntos' }, { id: 'lineas', label: 'Líneas' },
  { id: 'cuadricula', label: 'Cuadrícula' }, { id: 'papel', label: 'Papel' },
]

export const DEFAULT_THEME: Theme = {
  template: 'clasico', primary_color: '#ea580c', secondary_color: '#fff7ed', button_color: '#ea580c',
  font: 'Inter', card_style: 'redondeada', layout: 'horizontal',
  bg_mode: 'plantilla', bg_color: '#fafaf9', bg_gradient: 'atardecer', bg_texture: 'puntos',
}

const BASE = {
  clasico: { bg: '#fafaf9', surface: '#ffffff', text: '#1c1917', muted: '#78716c', border: '#e7e5e4' },
  moderno: { bg: '#ffffff', surface: '#f5f5f4', text: '#0c0a09', muted: '#57534e', border: '#e7e5e4' },
  oscuro: { bg: '#0c0a09', surface: '#1c1917', text: '#fafaf9', muted: '#a8a29e', border: '#292524' },
  elegante: { bg: '#fdf8f0', surface: '#fffdf8', text: '#292524', muted: '#78716c', border: '#e8dcc8' },
} as const

export const isDarkColor = (hex: string) => readableOn(hex) === '#ffffff'

function rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return `rgba(255,255,255,${a})`
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

/** Patrón sutil (sin imágenes externas: no pesa nada). */
export function textureStyle(id: BgTexture, dark: boolean): CSSProperties {
  const ink = dark ? '255,255,255' : '0,0,0'
  switch (id) {
    case 'lineas':
      return { backgroundImage: `repeating-linear-gradient(45deg, rgba(${ink},0.06) 0, rgba(${ink},0.06) 1px, transparent 1px, transparent 14px)` }
    case 'cuadricula':
      return {
        backgroundImage: `linear-gradient(rgba(${ink},0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(${ink},0.06) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }
    case 'papel':
      return {
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='${dark ? 0.12 : 0.07}'/></svg>")`,
      }
    default:
      return { backgroundImage: `radial-gradient(rgba(${ink},0.12) 1px, transparent 1px)`, backgroundSize: '18px 18px' }
  }
}

export function themeVars(t: Theme): CSSProperties {
  const b = BASE[t.template] ?? BASE.clasico
  const mode: BgMode = t.bg_mode ?? 'plantilla'
  // Las tarjetas siempre usan la paleta de la plantilla (legibles por construcción)
  const card = { surface: b.surface, text: b.text, muted: b.muted, border: b.border }
  let page: { text: string; muted: string; border: string } = { text: b.text, muted: b.muted, border: b.border }
  let bgColor: string = b.bg
  let bgStyle: CSSProperties = { backgroundColor: b.bg }
  let navBg = rgba(b.bg, 0.92)

  if (mode === 'color' || mode === 'textura') {
    bgColor = t.bg_color || b.bg
    const dark = isDarkColor(bgColor)
    bgStyle = mode === 'textura' ? { backgroundColor: bgColor, ...textureStyle(t.bg_texture, dark) } : { backgroundColor: bgColor }
    navBg = rgba(bgColor, 0.92)
    page = dark ? { text: '#fafaf9', muted: '#d6d3d1', border: 'rgba(255,255,255,0.22)' } : { text: '#1c1917', muted: '#57534e', border: 'rgba(0,0,0,0.12)' }
  } else if (mode === 'degradado') {
    const g = GRADIENTS.find((x) => x.id === t.bg_gradient) ?? GRADIENTS[0]
    bgColor = g.from
    bgStyle = { backgroundColor: g.from, backgroundImage: gradientCss(g) }
    navBg = rgba(g.from, 0.9)
    page = g.dark ? { text: '#fafaf9', muted: '#d6d3d1', border: 'rgba(255,255,255,0.22)' } : { text: '#1c1917', muted: '#57534e', border: 'rgba(0,0,0,0.12)' }
  }

  return {
    ...bgStyle,
    '--bg': bgColor, '--nav-bg': navBg,
    '--text': page.text, '--muted': page.muted, '--border': page.border,
    '--surface': card.surface, '--card-text': card.text, '--card-muted': card.muted, '--card-border': card.border,
    '--primary': t.primary_color, '--secondary': t.secondary_color, '--btn': t.button_color,
    '--on-primary': readableOn(t.primary_color), '--on-secondary': readableOn(t.secondary_color),
    '--on-btn': readableOn(t.button_color),
    fontFamily: `'${t.font}', system-ui, sans-serif`,
  } as CSSProperties
}

export function loadFont(font: string) {
  const id = `font-${font.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const l = document.createElement('link')
  l.id = id
  l.rel = 'stylesheet'
  l.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`
  document.head.appendChild(l)
}