import { PhoneIcon } from "lucide-react"

import { WhatsappIcon } from "@/components/whatsapp-icon"
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"

/**
 * Fila compacta con el capitán asignado y su teléfono para marcar rápido
 * o escribirle por WhatsApp.
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
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={`tel:${digits}`}
            title={formatPhoneDisplay(digits)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <PhoneIcon className="size-3.5" />
            Llamar
          </a>
          <a
            href={`https://wa.me/52${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`WhatsApp a ${formatPhoneDisplay(digits)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <WhatsappIcon className="size-3.5" />
            WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}
