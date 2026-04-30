"use client"

import { CheckIcon } from "lucide-react"

import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

export function DisponibilidadSelector({
  value,
  onChange,
}: {
  value: DisponibilidadSlot[]
  onChange: (next: DisponibilidadSlot[]) => void
}) {
  const set = new Set(value)

  function toggle(slot: DisponibilidadSlot) {
    const next = new Set(set)
    if (next.has(slot)) next.delete(slot)
    else next.add(slot)
    onChange(Array.from(next))
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Día
              </th>
              {DISPONIBILIDAD_SESIONES.map((s) => (
                <th
                  key={s.key}
                  className="border-l px-3 py-2 text-center text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISPONIBILIDAD_DIAS.map((d) => (
              <tr key={d.key} className="border-b last:border-b-0">
                <td className="px-3 py-2 font-medium text-foreground">
                  {d.label}
                </td>
                {DISPONIBILIDAD_SESIONES.map((s) => {
                  const slot = `${d.key}-${s.key}` as DisponibilidadSlot
                  const on = set.has(slot)
                  return (
                    <td
                      key={s.key}
                      className="border-l p-2 text-center align-middle"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(slot)}
                        aria-pressed={on}
                        aria-label={`${d.label} ${s.label}`}
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted",
                        )}
                      >
                        {on ? <CheckIcon className="size-4" /> : null}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length === 0
          ? "Sin disponibilidad seleccionada."
          : `${value.length} sesión${value.length === 1 ? "" : "es"} seleccionada${
              value.length === 1 ? "" : "s"
            }.`}
      </p>
    </div>
  )
}
