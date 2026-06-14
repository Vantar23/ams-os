"use client"

import { useTurno } from "@/components/turno-context"
import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
} from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

/**
 * Badge informativo del turno. Muestra el turno seleccionado en la vista; si
 * coincide con el que está realmente en curso (según fecha/hora) lo etiqueta
 * como "en curso", y si es otro distinto, como "seleccionado".
 */
export function TurnoEnCursoBadge() {
  const { selected, currentSlot } = useTurno()

  // En "Vista General" (todos) se muestra el turno en curso; con un turno
  // concreto seleccionado, ese.
  const slot = selected !== "todos" ? selected : currentSlot
  if (!slot) return null

  const [diaKey, sesionKey] = slot.split("-")
  const dia = DISPONIBILIDAD_DIAS.find((d) => d.key === diaKey)?.label ?? diaKey
  const sesion =
    DISPONIBILIDAD_SESIONES.find((s) => s.key === sesionKey)?.label ?? sesionKey
  const enCurso = slot === currentSlot

  return (
    <div
      className={cn(
        "flex flex-col items-end rounded-md border px-2.5 py-1 text-right",
        enCurso ? "border-primary/30 bg-primary/5" : "border-border bg-muted/60",
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {enCurso ? "Turno en curso" : "Turno seleccionado"}
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          enCurso ? "text-primary" : "text-foreground",
        )}
      >
        {dia} · {sesion}
      </span>
    </div>
  )
}
