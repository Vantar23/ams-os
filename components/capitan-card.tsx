import { PhoneIcon } from "lucide-react"

import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"

/**
 * Fila compacta con el capitán asignado y su teléfono para marcar rápido.
 * Se usa en los portales de acomodador y hermana de apoyo.
 */
export function CapitanCard({
  nombre,
  apellido,
  telefono,
}: {
  nombre: string
  apellido: string
  telefono: string | null
}) {
  const digits = telefono ? normalizePhone(telefono) : ""
  return (
    <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2">
      <p className="min-w-0 truncate text-sm text-foreground">
        <span className="text-muted-foreground">Capitán: </span>
        <span className="font-medium">
          {nombre} {apellido}
        </span>
      </p>
      {digits && (
        <a
          href={`tel:${digits}`}
          title={formatPhoneDisplay(digits)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <PhoneIcon className="size-3.5" />
          Llamar
        </a>
      )}
    </div>
  )
}
