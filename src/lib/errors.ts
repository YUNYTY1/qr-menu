export function errMsg(e: unknown): string {
  const x = e as { message?: string; code?: string } | null
  if (!x) return 'Error desconocido'
  const m = x.message ?? ''
  const low = m.toLowerCase()

  if (x.code === '23505') return 'Ya existe un registro con ese valor (duplicado).'
  if (x.code === '23503') return 'No se puede completar: hay registros relacionados (por ejemplo, productos dentro de la categoría).'
  if (x.code === '23514') return 'Algún dato no cumple las reglas de validación.'
  if (x.code === '42501' || /row-level security|permission denied/i.test(m)) {
    return 'No tienes permiso para esta acción, o tu suscripción no permite editar.'
  }
  if (/failed to fetch|networkerror|load failed/i.test(m)) {
    return 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  }
  if (/already registered|already been registered|user already exists/i.test(low)) {
    return 'Ese correo ya tiene cuenta. Inicia sesión.'
  }
  if (/rate limit|too many requests|over_email_send_rate_limit|over_request_rate_limit/i.test(low)) {
    return 'Has realizado demasiados intentos en poco tiempo. Espera un minuto e inténtalo de nuevo.'
  }
  if (/error sending confirmation email|smtp|email provider/i.test(low)) {
    return 'No se pudo enviar el correo de verificación en este momento. Inténtalo de nuevo en unos minutos.'
  }
  if (/token has expired|otp_expired|invalid otp|invalid token|token is invalid/i.test(low)) {
    return 'El código es incorrecto o ya venció. Solicita uno nuevo e inténtalo otra vez.'
  }
  if (/captcha/i.test(low)) {
    return 'No se pudo validar la verificación anti-bot. Recarga la página e inténtalo de nuevo.'
  }

  return m || 'Error inesperado'
}