import { useCallback, useEffect, useRef, useState } from 'react'
import { errMsg } from '@/lib/errors'

export function useData<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const hasDataRef = useRef(false)

  useEffect(() => {
    let alive = true
    if (!hasDataRef.current) {
      setLoading(true)
    }
    setError(null)
    fnRef.current()
      .then((d) => {
        if (!alive) return
        hasDataRef.current = true
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setError(errMsg(e))
        setLoading(false)
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload, setData }
}