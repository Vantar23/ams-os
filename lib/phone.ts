/**
 * Normaliza un número de teléfono mexicano a 10 dígitos sin espacios,
 * paréntesis, guiones ni código de país.
 *
 * Ejemplos:
 *   "22 22 33 23 32"      -> "2222332332"
 *   "(+52) 55 1234 5678"  -> "5512345678"
 *   "+52 1 55 1234 5678"  -> "5512345678"
 *   "5512345678"          -> "5512345678"
 */
export function normalizePhone(input: string | null | undefined): string {
  let digits = (input ?? "").replace(/\D/g, "")
  // Quita el código de país de México: "52" (12 dígitos) o el prefijo
  // legado de móvil "521" (13 dígitos).
  if (digits.length === 13 && digits.startsWith("521")) {
    digits = digits.slice(3)
  } else if (digits.length === 12 && digits.startsWith("52")) {
    digits = digits.slice(2)
  }
  return digits
}

/** Un teléfono válido normalizado son exactamente 10 dígitos. */
export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone)
}

/** Formatea un teléfono de 10 dígitos para mostrar: "22 1234 5678". */
export function formatPhoneDisplay(phone: string): string {
  const d = normalizePhone(phone)
  if (!isValidPhone(d)) return phone
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`
}

export const TELEFONO_INVALIDO_MSG = "Teléfono inválido (10 dígitos, sin +52)"
