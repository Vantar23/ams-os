"use client"

import * as React from "react"
import { ClockIcon } from "lucide-react"

import {
  DISPONIBILIDAD_SLOTS,
  momentoEnRecinto,
  slotLabelCorto,
  slotsVisibles,
} from "@/lib/disponibilidad"

/** Tarjeta pequeña con el turno vigente según la hora del recinto. */
export function TurnoEnCursoCard() {
  // Se calcula al montar para no provocar mismatch de hidratación (el servidor
  // puede estar en otra zona horaria que el cliente).
  const [slot, setSlot] = React.useState<string | null>(null)
  React.useEffect(() => {
    const vigentes = slotsVisibles(DISPONIBILIDAD_SLOTS, momentoEnRecinto())
    setSlot(vigentes[0] ?? null)
  }, [])

  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-surface px-3 py-1.5">
      <ClockIcon className="size-4 shrink-0 text-primary" />
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Turno en curso
        </p>
        <p className="text-sm font-medium text-foreground">
          {slot ? slotLabelCorto(slot) : "Sin turno activo"}
        </p>
      </div>
    </div>
  )
}
