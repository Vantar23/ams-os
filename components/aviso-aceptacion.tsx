"use client"

import Link from "next/link"

import { Checkbox } from "@/components/ui/checkbox"

// Aceptación del aviso de privacidad para pantallas que no usan react-hook-form
// (p. ej. el primer acceso a un portal personal). Informa al titular en el
// primer contacto cuando sus datos fueron capturados por otra persona.
export function AvisoAceptacion({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="mt-6 flex items-start gap-3 text-left">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        className="mt-0.5"
        aria-label="Acepto el aviso de privacidad"
      />
      <span className="text-xs leading-relaxed text-muted-foreground">
        He leído y acepto el{" "}
        <Link
          href="/aviso-de-privacidad"
          target="_blank"
          className="underline underline-offset-2 hover:text-foreground"
        >
          aviso de privacidad
        </Link>{" "}
        y autorizo el tratamiento de mis datos personales.
      </span>
    </div>
  )
}

// Confirmación para quien captura los datos de OTRA persona (alta manual,
// accesos). La LFPDPPP exige que quien aporta datos de un tercero tenga
// autorización y que el titular sea informado del aviso en el primer contacto.
export function AutorizacionTercero({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 text-left">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        className="mt-0.5"
        aria-label="Confirmo que tengo autorización de esta persona"
      />
      <span className="text-xs leading-relaxed text-muted-foreground">
        Confirmo que tengo autorización de esta persona para registrar sus datos
        y que le haré llegar el{" "}
        <Link
          href="/aviso-de-privacidad"
          target="_blank"
          className="underline underline-offset-2 hover:text-foreground"
        >
          aviso de privacidad
        </Link>
        .
      </span>
    </div>
  )
}
