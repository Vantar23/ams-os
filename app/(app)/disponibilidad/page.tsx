"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const SESSIONS = ["Mañana", "Tarde"] as const
type Session = (typeof SESSIONS)[number]

const ACOMODADORES_DEMO = [
  { id: "1", nombre: "Juan Pérez", congregacion: "Centro" },
  { id: "2", nombre: "Carlos Méndez", congregacion: "Norte" },
  { id: "3", nombre: "Roberto Vargas", congregacion: "Sur" },
  { id: "4", nombre: "Andrés Ruiz", congregacion: "Centro" },
  { id: "5", nombre: "Felipe Castillo", congregacion: "Este" },
] as const

const dayKey = (d: Date) => format(d, "yyyy-MM-dd")
const slotKey = (d: Date, s: Session) => `${dayKey(d)}::${s}`

export default function DisponibilidadPage() {
  const [days, setDays] = React.useState<Date[]>([])
  const [available, setAvailable] = React.useState<Record<string, Set<string>>>(
    {}
  )

  function toggle(personId: string, day: Date, s: Session) {
    const key = slotKey(day, s)
    setAvailable((prev) => {
      const set = new Set(prev[personId] ?? [])
      if (set.has(key)) set.delete(key)
      else set.add(key)
      return { ...prev, [personId]: set }
    })
  }

  const sortedDays = React.useMemo(
    () => [...days].sort((a, b) => a.getTime() - b.getTime()),
    [days]
  )

  return (
    <>
      <PageHeader parent="Personal" title="Disponibilidad" />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[auto_1fr]">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Calendario
            </p>
            <h2 className="mt-2 font-serif text-2xl">Días de la asamblea</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Selecciona los días en los que se celebra la asamblea regional.
            </p>
            <div className="mt-4 inline-block rounded-md border border-border bg-surface p-3">
              <Calendar
                mode="multiple"
                selected={days}
                onSelect={(d) => setDays(d ?? [])}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {sortedDays.length === 0
                ? "Sin días seleccionados."
                : `${sortedDays.length} día${
                    sortedDays.length === 1 ? "" : "s"
                  } · ${sortedDays.length * SESSIONS.length} sesiones`}
            </p>
          </section>

          <section className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Personal
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              Disponibilidad por sesión
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Marca las sesiones que cada hermano puede servir.
            </p>

            {sortedDays.length === 0 ? (
              <div className="mt-4 rounded-md border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
                Selecciona al menos un día en el calendario para comenzar a
                marcar disponibilidad.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border border-border bg-surface">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-10 bg-surface px-4 py-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground"
                      >
                        Hermano
                      </th>
                      {sortedDays.map((d) => (
                        <th
                          key={dayKey(d)}
                          colSpan={SESSIONS.length}
                          className="border-l border-border px-3 py-3 text-center"
                        >
                          <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                            {format(d, "EEEE", { locale: es })}
                          </div>
                          <div className="font-serif text-base capitalize text-foreground">
                            {format(d, "d 'de' LLLL", { locale: es })}
                          </div>
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      {sortedDays.map((d) =>
                        SESSIONS.map((s) => (
                          <th
                            key={slotKey(d, s)}
                            className="border-l border-border px-3 py-2 text-center text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground"
                          >
                            {s}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {ACOMODADORES_DEMO.map((p) => {
                      const personSet = available[p.id] ?? new Set<string>()
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="sticky left-0 z-10 bg-surface px-4 py-3 align-top">
                            <div className="font-medium text-foreground">
                              {p.nombre}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.congregacion}
                            </div>
                          </td>
                          {sortedDays.map((d) =>
                            SESSIONS.map((s) => {
                              const key = slotKey(d, s)
                              const on = personSet.has(key)
                              return (
                                <td
                                  key={key}
                                  className="border-l border-border p-2 text-center align-middle"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggle(p.id, d, s)}
                                    aria-pressed={on}
                                    aria-label={`${p.nombre} — ${format(
                                      d,
                                      "EEEE d 'de' LLLL",
                                      { locale: es }
                                    )} ${s}`}
                                    className={cn(
                                      "inline-flex size-7 items-center justify-center rounded-md border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      on
                                        ? "bg-primary text-primary-foreground hover:bg-accent"
                                        : "bg-background hover:bg-surface"
                                    )}
                                  >
                                    {on ? <CheckIcon className="size-4" /> : null}
                                  </button>
                                </td>
                              )
                            })
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {sortedDays.length > 0 && (
          <section className="mt-12 border-t border-border pt-10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Vista global
            </p>
            <h2 className="mt-2 font-serif text-2xl">Resumen por día</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Total de hermanos disponibles en cada sesión.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedDays.map((d) => (
                <article
                  key={dayKey(d)}
                  className="rounded-md border border-border bg-surface p-5"
                >
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {format(d, "EEEE", { locale: es })}
                  </p>
                  <p className="mt-1 font-serif text-xl capitalize text-foreground">
                    {format(d, "d 'de' LLLL", { locale: es })}
                  </p>
                  <div className="mt-4 divide-y divide-border">
                    {SESSIONS.map((s) => {
                      const key = slotKey(d, s)
                      const personas = ACOMODADORES_DEMO.filter((p) =>
                        available[p.id]?.has(key)
                      )
                      return (
                        <div key={s} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {s}
                            </span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                              {personas.length} disponible
                              {personas.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          {personas.length > 0 && (
                            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                              {personas.map((p) => (
                                <li key={p.id}>· {p.nombre}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
