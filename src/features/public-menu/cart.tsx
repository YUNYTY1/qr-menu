import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product, Promotion } from '@/types'

export interface CartLine {
  id: string
  name: string
  price: number
  qty: number
  image_url?: string | null
  /** 'promo' = promoción; sin valor = producto normal */
  kind?: 'promo'
}

type CartItem = Pick<Product, 'id' | 'name' | 'price' | 'image_url'> & { kind?: 'promo' }

interface CartCtx {
  lines: CartLine[]
  count: number
  total: number
  add: (p: CartItem) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  sync: (products: Product[], promotions?: Promotion[]) => void
}

const Ctx = createContext<CartCtx>(null!)
export const useCart = () => useContext(Ctx)

export function CartProvider({ storageKey, children }: { storageKey?: string; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (!storageKey) return []
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as CartLine[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [lines, storageKey])

  const add = useCallback((p: CartItem) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id)
      if (i >= 0) {
        return ls.map((l, k) => (k === i ? { ...l, qty: Math.min(99, l.qty + 1), image_url: p.image_url ?? l.image_url } : l))
      }
      return [...ls, { id: p.id, name: p.name, price: Number(p.price), qty: 1, image_url: p.image_url ?? null, ...(p.kind ? { kind: p.kind } : {}) }]
    })
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l))))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  // Quita productos y promociones que ya no existen / están agotados y actualiza los precios guardados
  const sync = useCallback((products: Product[], promotions: Promotion[] = []) => {
    setLines((ls) => {
      const next = ls.flatMap((l) => {
        if (l.kind === 'promo') {
          const pr = promotions.find((x) => x.id === l.id)
          return pr && pr.price != null
            ? [{ ...l, name: pr.title, price: Number(pr.price), image_url: pr.image_url ?? null }]
            : []
        }
        const p = products.find((x) => x.id === l.id)
        return p && p.is_available ? [{ ...l, name: p.name, price: Number(p.price), image_url: p.image_url ?? null }] : []
      })
      return JSON.stringify(next) === JSON.stringify(ls) ? ls : next
    })
  }, [])

  const value = useMemo(
    () => ({
      lines,
      add,
      setQty,
      clear,
      sync,
      count: lines.reduce((s, l) => s + l.qty, 0),
      total: lines.reduce((s, l) => s + l.qty * l.price, 0),
    }),
    [lines, add, setQty, clear, sync],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
