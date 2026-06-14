import { ChevronDownIcon, PhoneIcon } from "lucide-react"

import { WhatsappIcon } from "@/components/whatsapp-icon"
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone"

/**
 * Desplegable con el capitán asignado: muestra su nombre y, al abrirlo, las
 * acciones para marcar o escribirle por WhatsApp.
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
    <details className="group mt-4 rounded-lg border bg-surface [&[open]>summary_.chevron]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <p className="min-w-0 truncate text-sm text-foreground">
          <span className="text-muted-foreground">Capitán: </span>
          <span className="font-medium">
            {nombre} {apellido}
          </span>
        </p>
        <ChevronDownIcon className="chevron size-4 shrink-0 text-muted-foreground transition-transform" />
      </summary>
      <div className="border-t border-border px-3 py-2.5">
        {digits ? (
          <div className="flex flex-wrap items-center gap-1.5">
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
        ) : (
          <p className="text-xs text-muted-foreground">
            Este capitán no tiene teléfono registrado.
          </p>
        )}
      </div>
    </details>
  )
}
