"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Checkbox } from "@/components/ui/checkbox"
import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

import { toggleSelfAsistencia } from "./actions"

const SLOT_LABEL: Record<DisponibilidadSlot, { dia: string; sesion: string }> =
  Object.fromEntries(
    DISPONIBILIDAD_DIAS.flatMap((d) =>
      DISPONIBILIDAD_SESIONES.map((s) => [
        `${d.key}-${s.key}` as DisponibilidadSlot,
        { dia: d.label, sesion: s.label },
      ]),
    ),
  ) as Record<DisponibilidadSlot, { dia: string; sesion: string }>

export function AsistenciaSection({
  accessToken,
  disponibilidad,
  selfConfirmadas,
}: {
  accessToken: string
  disponibilidad: DisponibilidadSlot[]
  selfConfirmadas: DisponibilidadSlot[]
}) {
  const router = useRouter()
  const [overrides, setOverrides] = React.useState<
    Record<string, boolean>
  >({})

  function isConfirmed(slot: DisponibilidadSlot): boolean {
    if (slot in overrides) return overrides[slot]
    return selfConfirmadas.includes(slot)
  }

  async function handleToggle(slot: DisponibilidadSlot, next: boolean) {
    setOverrides((o) => ({ ...o, [slot]: next }))
    const { ok, error } = await toggleSelfAsistencia({
      accessToken,
      slot,
      confirmar: next,
    })
    if (!ok) {
      setOverrides((o) => {
        const copy = { ...o }
        delete copy[slot]
        return copy
      })
      alert(error)
      return
    }
    router.refresh()
  }

  if (disponibilidad.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Aún no tienes sesiones marcadas como disponibles. Pídele a tu capitán
        que las agregue.
      </p>
    )
  }

  return (
    <ul className="mt-4 divide-y rounded-md border">
      {disponibilidad.map((slot) => {
        const label = SLOT_LABEL[slot]
        if (!label) return null
        const confirmed = isConfirmed(slot)
        return (
          <li
            key={slot}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
              confirmed && "bg-primary/5",
            )}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {label.dia}
              </span>
              <span className="text-xs text-muted-foreground">
                {label.sesion}
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <span>Voy a estar</span>
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => handleToggle(slot, Boolean(v))}
                aria-label={`Confirmar asistencia ${label.dia} ${label.sesion}`}
              />
            </label>
          </li>
        )
      })}
    </ul>
  )
}
