import { PhoneIcon } from "lucide-react"

import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"

/**
 * Tarjeta con el capitán asignado y su teléfono para marcar rápido.
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
    <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border bg-surface p-4">
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Tu capitán
        </span>
        <span className="truncate text-base font-medium text-foreground">
          {nombre} {apellido}
        </span>
        {digits && (
          <span className="text-xs text-muted-foreground">
            {formatPhoneDisplay(digits)}
          </span>
        )}
      </div>
      {digits && (
        <a
          href={`tel:${digits}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <PhoneIcon className="size-4" />
          Llamar
        </a>
      )}
    </div>
  )
}
