import { PhoneIcon } from "lucide-react"

import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"

/**
 * Botón para marcar al teléfono de primeros auxilios de la asamblea
 * (asambleas.primeros_auxilios_telefono). No se muestra si no hay número.
 */
export function PrimerosAuxiliosButton({
  telefono,
}: {
  telefono: string | null | undefined
}) {
  const digits = telefono ? normalizePhone(telefono) : ""
  if (!digits) return null
  return (
    <a
      href={`tel:${digits}`}
      title={formatPhoneDisplay(digits)}
      className="inline-flex w-fit items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15"
    >
      <PhoneIcon className="size-4" />
      Llamar a primeros auxilios
    </a>
  )
}
