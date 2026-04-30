"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

import { toggleAsistencia } from "./actions"

type Asamblea = { id: string; numero: string; edicion: string }

type Capitan = {
  id: string
  nombre: string
  apellido: string
  area: string
  telefono: string
  disponibilidad: string[]
  asistencia_confirmada: string[]
}

type Acomodador = {
  id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  capitan_id: string | null
  disponibilidad: string[]
  asistencia_confirmada: string[]
  asistencia_self_confirmada: string[]
}

type Hermana = Acomodador

const ALL_SLOTS: { slot: DisponibilidadSlot; dia: string; sesion: string }[] =
  DISPONIBILIDAD_DIAS.flatMap((d) =>
    DISPONIBILIDAD_SESIONES.map((s) => ({
      slot: `${d.key}-${s.key}` as DisponibilidadSlot,
      dia: d.label,
      sesion: s.label,
    })),
  )

type Filtro = "todos" | "capitanes" | "acomodadores" | "hermanas"
type Tipo = "capitan" | "acomodador" | "hermana"

export function DisponibilidadView({
  asamblea,
  capitanes,
  acomodadores,
  hermanas,
}: {
  asamblea: Asamblea
  capitanes: Capitan[]
  acomodadores: Acomodador[]
  hermanas: Hermana[]
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<DisponibilidadSlot | "todos">(
    "todos",
  )
  const [filtro, setFiltro] = React.useState<Filtro>("todos")
  const showCapitanes = filtro === "todos" || filtro === "capitanes"
  const showAcomodadores = filtro === "todos" || filtro === "acomodadores"
  const showHermanas = filtro === "todos" || filtro === "hermanas"
  // Optimistic overrides keyed by `${tipo}:${id}:${slot}` -> boolean
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>(
    {},
  )

  function isConfirmed(
    tipo: Tipo,
    id: string,
    slot: DisponibilidadSlot,
    persisted: string[],
  ): boolean {
    const key = `${tipo}:${id}:${slot}`
    if (key in overrides) return overrides[key]
    return persisted.includes(slot)
  }

  async function handleToggle(
    tipo: Tipo,
    id: string,
    slot: DisponibilidadSlot,
    next: boolean,
  ) {
    const key = `${tipo}:${id}:${slot}`
    setOverrides((o) => ({ ...o, [key]: next }))
    const { error } = await toggleAsistencia({
      tipo,
      id,
      slot,
      confirmar: next,
    })
    if (error) {
      setOverrides((o) => {
        const copy = { ...o }
        delete copy[key]
        return copy
      })
      alert(error)
      return
    }
    router.refresh()
  }

  const counts = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const { slot } of ALL_SLOTS) {
      const c =
        capitanes.filter((x) => x.disponibilidad.includes(slot)).length +
        acomodadores.filter((x) => x.disponibilidad.includes(slot)).length +
        hermanas.filter((x) => x.disponibilidad.includes(slot)).length
      map[slot] = c
    }
    return map
  }, [capitanes, acomodadores, hermanas])

  const selectedCapitanes = capitanes.filter((c) =>
    selected === "todos" ? true : c.disponibilidad.includes(selected),
  )
  const selectedAcomodadores = acomodadores.filter((a) =>
    selected === "todos" ? true : a.disponibilidad.includes(selected),
  )
  const selectedHermanas = hermanas.filter((h) =>
    selected === "todos" ? true : h.disponibilidad.includes(selected),
  )

  const capitanById = React.useMemo(() => {
    const m = new Map<string, Capitan>()
    capitanes.forEach((c) => m.set(c.id, c))
    return m
  }, [capitanes])

  const selectedLabel = ALL_SLOTS.find((s) => s.slot === selected)
  const totalSelected =
    selectedCapitanes.length +
    selectedAcomodadores.length +
    selectedHermanas.length

  const totalAll = capitanes.length + acomodadores.length + hermanas.length

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
      <div>
        <h2 className="text-lg font-semibold">Disponibilidad</h2>
        <p className="text-sm text-muted-foreground">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
      </div>

      {/* Mobile slot picker — horizontal scrolling chips */}
      <nav className="-mx-3 sm:hidden">
        <div className="flex gap-2 overflow-x-auto px-3 pb-1">
          <SlotChip
            label="Todos"
            count={totalAll}
            active={selected === "todos"}
            onClick={() => setSelected("todos")}
          />
          {ALL_SLOTS.map(({ slot, dia, sesion }) => (
            <SlotChip
              key={slot}
              label={`${dia.slice(0, 3)} · ${sesion}`}
              count={counts[slot]}
              active={selected === slot}
              onClick={() => setSelected(slot)}
            />
          ))}
        </div>
      </nav>

      <div className="grid flex-1 gap-4 sm:grid-cols-[minmax(180px,280px)_minmax(0,1fr)]">
        <aside className="hidden rounded-xl border bg-surface sm:block">
          <div className="border-b p-2">
            <button
              type="button"
              onClick={() => setSelected("todos")}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                selected === "todos"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              <span>Todos</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  selected === "todos"
                    ? "border-primary-foreground/40 text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {totalAll}
              </span>
            </button>
          </div>
          {DISPONIBILIDAD_DIAS.map((d) => (
            <div
              key={d.key}
              className="border-b last:border-b-0"
            >
              <div className="px-4 pt-5 pb-1 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {d.label}
              </div>
              <ul className="px-2 pb-2">
                {DISPONIBILIDAD_SESIONES.map((s) => {
                  const slot = `${d.key}-${s.key}` as DisponibilidadSlot
                  const active = slot === selected
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => setSelected(slot)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <span>{s.label}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px]",
                            active
                              ? "border-primary-foreground/40 text-primary-foreground"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {counts[slot]}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </aside>

        <section className="rounded-xl border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                {selected === "todos" ? "Vista general" : selectedLabel?.dia}
              </p>
              <h3 className="mt-1 font-serif text-xl">
                {selected === "todos" ? "Todos" : selectedLabel?.sesion}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {selected === "todos"
                ? `${capitanes.length + acomodadores.length} hermano${
                    capitanes.length + acomodadores.length === 1 ? "" : "s"
                  }`
                : `${totalSelected} hermano${
                    totalSelected === 1 ? "" : "s"
                  } disponible${totalSelected === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="mt-4 inline-flex flex-wrap rounded-full border bg-background p-0.5 text-xs">
            {(
              [
                { key: "todos", label: "Todos" },
                { key: "capitanes", label: "Capitanes" },
                { key: "acomodadores", label: "Acomodadores" },
                { key: "hermanas", label: "Hermanas" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  filtro === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {selected === "todos" ? (
            <div
              className="mt-6 grid grid-cols-1 gap-6"
            >
              {showCapitanes && (
                <Group
                  title="Capitanes"
                  empty="Ningún capitán registrado."
                  count={capitanes.length}
                >
                  {capitanes.map((c) => (
                    <MatrixRow
                      key={c.id}
                      title={`${c.nombre} ${c.apellido}`}
                      subtitle={c.area}
                      telefono={c.telefono}
                      disponibilidad={c.disponibilidad}
                      confirmadas={c.asistencia_confirmada}
                    />
                  ))}
                </Group>
              )}

              {showAcomodadores && (
                <Group
                  title="Acomodadores"
                  empty="Ningún acomodador registrado."
                  count={acomodadores.length}
                >
                  {acomodadores.map((a) => {
                    const capitan = a.capitan_id
                      ? capitanById.get(a.capitan_id)
                      : null
                    return (
                      <MatrixRow
                        key={a.id}
                        title={`${a.nombre} ${a.apellido}`}
                        subtitle={
                          capitan
                            ? `${a.congregacion} · ${capitan.nombre} ${capitan.apellido}`
                            : a.congregacion
                        }
                        telefono={a.telefono}
                        disponibilidad={a.disponibilidad}
                        confirmadas={a.asistencia_confirmada}
                      />
                    )
                  })}
                </Group>
              )}

              {showHermanas && (
                <Group
                  title="Hermanas de Apoyo"
                  empty="Ninguna hermana registrada."
                  count={hermanas.length}
                >
                  {hermanas.map((h) => {
                    const capitan = h.capitan_id
                      ? capitanById.get(h.capitan_id)
                      : null
                    return (
                      <MatrixRow
                        key={h.id}
                        title={`${h.nombre} ${h.apellido}`}
                        subtitle={
                          capitan
                            ? `${h.congregacion} · ${capitan.nombre} ${capitan.apellido}`
                            : h.congregacion
                        }
                        telefono={h.telefono}
                        disponibilidad={h.disponibilidad}
                        confirmadas={h.asistencia_confirmada}
                      />
                    )
                  })}
                </Group>
              )}
            </div>
          ) : (
            <div
              className="mt-6 grid grid-cols-1 gap-6"
            >
              {showCapitanes && (
                <Group
                  title="Capitanes"
                  empty="Ningún capitán disponible."
                  count={selectedCapitanes.length}
                  rightLabel="Confirmación de asistencia"
                >
                  {selectedCapitanes.map((c) => {
                    const confirmed = isConfirmed(
                      "capitan",
                      c.id,
                      selected,
                      c.asistencia_confirmada,
                    )
                    return (
                      <PersonRow
                        key={c.id}
                        title={`${c.nombre} ${c.apellido}`}
                        subtitle={c.area}
                        telefono={c.telefono}
                        confirmed={confirmed}
                        onToggle={(v) =>
                          handleToggle("capitan", c.id, selected, v)
                        }
                      />
                    )
                  })}
                </Group>
              )}

              {showAcomodadores && (
                <Group
                  title="Acomodadores"
                  empty="Ningún acomodador disponible."
                  count={selectedAcomodadores.length}
                  rightLabel="Confirmación de asistencia"
                >
                  {selectedAcomodadores.map((a) => {
                    const capitan = a.capitan_id
                      ? capitanById.get(a.capitan_id)
                      : null
                    const confirmed = isConfirmed(
                      "acomodador",
                      a.id,
                      selected,
                      a.asistencia_confirmada,
                    )
                    const selfConfirmed =
                      a.asistencia_self_confirmada.includes(selected)
                    return (
                      <PersonRow
                        key={a.id}
                        title={`${a.nombre} ${a.apellido}`}
                        subtitle={
                          capitan
                            ? `${a.congregacion} · ${capitan.nombre} ${capitan.apellido}`
                            : a.congregacion
                        }
                        telefono={a.telefono}
                        confirmed={confirmed}
                        selfConfirmed={selfConfirmed}
                        onToggle={(v) =>
                          handleToggle("acomodador", a.id, selected, v)
                        }
                      />
                    )
                  })}
                </Group>
              )}

              {showHermanas && (
                <Group
                  title="Hermanas de Apoyo"
                  empty="Ninguna hermana disponible."
                  count={selectedHermanas.length}
                  rightLabel="Confirmación de asistencia"
                >
                  {selectedHermanas.map((h) => {
                    const capitan = h.capitan_id
                      ? capitanById.get(h.capitan_id)
                      : null
                    const confirmed = isConfirmed(
                      "hermana",
                      h.id,
                      selected,
                      h.asistencia_confirmada,
                    )
                    const selfConfirmed =
                      h.asistencia_self_confirmada.includes(selected)
                    return (
                      <PersonRow
                        key={h.id}
                        title={`${h.nombre} ${h.apellido}`}
                        subtitle={
                          capitan
                            ? `${h.congregacion} · ${capitan.nombre} ${capitan.apellido}`
                            : h.congregacion
                        }
                        telefono={h.telefono}
                        confirmed={confirmed}
                        selfConfirmed={selfConfirmed}
                        onToggle={(v) =>
                          handleToggle("hermana", h.id, selected, v)
                        }
                      />
                    )
                  })}
                </Group>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SlotChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] tabular-nums",
          active
            ? "bg-primary-foreground/20"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function PersonRow({
  title,
  subtitle,
  telefono,
  confirmed,
  selfConfirmed,
  onToggle,
}: {
  title: string
  subtitle: string
  telefono: string
  confirmed: boolean
  selfConfirmed?: boolean
  onToggle: (next: boolean) => void
}) {
  const [pending, setPending] = React.useState<boolean | null>(null)
  const willConfirm = pending === true
  return (
    <>
      <li
        className={cn(
          "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
          confirmed && "bg-primary/5",
        )}
      >
        <a
          href={`tel:${telefono.replace(/\D/g, "")}`}
          className="flex min-w-0 flex-1 flex-col rounded-md hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate text-sm font-medium text-foreground">
            {title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {telefono}
          </span>
          {selfConfirmed && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-primary">
              Confirmado por el acomodador
            </span>
          )}
        </a>
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setPending(Boolean(v))}
          aria-label="Confirmación de asistencia"
          className="ml-auto"
        />
      </li>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {willConfirm
                ? `¿Confirmar la asistencia de ${title}?`
                : `¿Quitar la confirmación de ${title}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {willConfirm
                ? "Marcará al hermano como confirmado para esta sesión."
                : "Se quitará la marca de confirmación, incluida la del propio acomodador si la había."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending !== null) onToggle(pending)
                setPending(null)
              }}
            >
              {willConfirm ? "Confirmar" : "Quitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MatrixRow({
  title,
  subtitle,
  telefono,
  disponibilidad,
  confirmadas,
}: {
  title: string
  subtitle: string
  telefono: string
  disponibilidad: string[]
  confirmadas: string[]
}) {
  const slots = DISPONIBILIDAD_DIAS.flatMap((d) =>
    DISPONIBILIDAD_SESIONES.map((s) => ({
      key: `${d.key}-${s.key}`,
      label: `${d.label.slice(0, 3)} ${s.label[0]}`,
      available: disponibilidad.includes(`${d.key}-${s.key}`),
      confirmed: confirmadas.includes(`${d.key}-${s.key}`),
    })),
  )
  const visible = slots.filter((s) => s.available)
  return (
    <li className="flex items-start gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
          <a
            href={`tel:${telefono.replace(/\D/g, "")}`}
            className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {telefono}
          </a>
        </div>
        {visible.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Sin disponibilidad
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visible.map((s) => (
              <span
                key={s.key}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                  s.confirmed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/70",
                )}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

function Group({
  title,
  count,
  empty,
  rightLabel,
  children,
}: {
  title: string
  count: number
  empty: string
  rightLabel?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <h4 className="flex items-baseline gap-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          <span>{title}</span>
          <span className="text-[11px] text-muted-foreground/70">
            ({count})
          </span>
        </h4>
        {rightLabel && (
          <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {rightLabel}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">{children}</ul>
      )}
    </div>
  )
}
