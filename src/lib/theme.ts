import type { CSSProperties } from 'react'
import type { Theme } from '@/types'
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
  { id: 'cuadricula', label: 'Cuadrícula (2 columnas)' }, { id: 'lista', label: 'Lista con miniatura' }, { id: 'grande', label: 'Tarjetas grandes' },
] as const

export const DEFAULT_THEME: Theme = {
  template: 'clasico', primary_color: '#ea580c', secondary_color: '#fff7ed', button_color: '#ea580c',
  font: 'Inter', card_style: 'redondeada', layout: 'cuadricula',
}

const BASE = {
  clasico: { bg: '#fafaf9', surface: '#ffffff', text: '#1c1917', muted: '#78716c', border: '#e7e5e4' },
  moderno: { bg: '#ffffff', surface: '#f5f5f4', text: '#0c0a09', muted: '#57534e', border: '#e7e5e4' },
  oscuro: { bg: '#0c0a09', surface: '#1c1917', text: '#fafaf9', muted: '#a8a29e', border: '#292524' },
  elegante: { bg: '#fdf8f0', surface: '#fffdf8', text: '#292524', muted: '#78716c', border: '#e8dcc8' },
} as const

export function themeVars(t: Theme): CSSProperties {
  const b = BASE[t.template] ?? BASE.clasico
  return {
    '--bg': b.bg, '--surface': b.surface, '--text': b.text, '--muted': b.muted, '--border': b.border,
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
