export function errMsg(e: unknown): string {
  const x = e as { message?: string; code?: string } | null
  if (!x) return 'Error desconocido'
  const m = x.message ?? ''
  if (x.code === '23505') return 'Ya existe un registro con ese valor (duplicado).'
  if (x.code === '23503') return 'No se puede completar: hay registros relacionados (por ejemplo, productos dentro de la categoría).'
  if (x.code === '23514') return 'Algún dato no cumple las reglas de validación.'
  if (x.code === '42501' || /row-level security|permission denied/i.test(m))
    return 'No tienes permiso para esta acción, o tu suscripción no permite editar.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  return m || 'Error inesperado'
}
