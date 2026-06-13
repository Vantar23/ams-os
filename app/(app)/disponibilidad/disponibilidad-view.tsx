"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, CopyIcon, MessageCircleIcon } from "lucide-react"

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
import {
  BuscadorPersonal,
  coincideBusqueda,
} from "@/components/buscador-personal"
import { Checkbox } from "@/components/ui/checkbox"
import {
  currentDiaSesion,
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
  area: string[]
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
  access_token: string
  disponibilidad: string[]
  asistencia_confirmada: string[]
  asistencia_self_confirmada: string[]
}

type Hermana = Acomodador

type Area = { id: string; piso: string; nombre: string }
type Asignacion = { acomodador_id: string; area_id: string; slot: string }

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

function buildDisponibilidadShareUrl(
  origin: string,
  basePath: "/acomodador/" | "/hermana-apoyo/",
  accessToken: string,
  telefono: string,
  nombre: string,
): string | undefined {
  if (!origin) return undefined
  const phone = telefono.replace(/\D/g, "")
  const url = `${origin}${basePath}${accessToken}`
  const text = `Hola ${nombre}, te paso tu enlace personal para confirmar tu disponibilidad y asistencia: ${url}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

export function DisponibilidadView({
  asamblea,
  capitanes,
  acomodadores,
  hermanas,
  areas,
  asignaciones,
}: {
  asamblea: Asamblea
  capitanes: Capitan[]
  acomodadores: Acomodador[]
  hermanas: Hermana[]
  areas: Area[]
  asignaciones: Asignacion[]
}) {
  const router = useRouter()
  const [origin, setOrigin] = React.useState("")
  const [isDesktopSm, setIsDesktopSm] = React.useState(false)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee origin/viewport del navegador al montar
    setOrigin(window.location.origin)
    const mq = window.matchMedia("(min-width: 640px)")
    const update = () => setIsDesktopSm(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  const [selected, setSelected] = React.useState<DisponibilidadSlot | "todos">(
    "todos",
  )
  const [filtro, setFiltro] = React.useState<Filtro>("todos")
  const [busqueda, setBusqueda] = React.useState("")
  const [areaFiltro, setAreaFiltro] = React.useState<string>("todas")
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

  // Puesto asignado por acomodador y turno: clave `${acomodadorId}:${slot}`.
  const areaLabelById = React.useMemo(() => {
    const m = new Map<string, string>()
    areas.forEach((a) => m.set(a.id, `${a.piso} · ${a.nombre}`))
    return m
  }, [areas])
  const puestoPorAcoSlot = React.useMemo(() => {
    const m = new Map<string, string>()
    asignaciones.forEach((a) => {
      const label = areaLabelById.get(a.area_id)
      if (label) m.set(`${a.acomodador_id}:${a.slot}`, label)
    })
    return m
  }, [asignaciones, areaLabelById])
  // Turno actual (según fecha/hora del cliente) para el puesto en vista "Todos".
  const [currentSlot, setCurrentSlot] = React.useState<string | null>(null)
  React.useEffect(() => {
    const { dia, sesion } = currentDiaSesion()
    setCurrentSlot(`${dia}-${sesion}`)
  }, [])
  const puestoActual = (acoId: string) =>
    currentSlot ? puestoPorAcoSlot.get(`${acoId}:${currentSlot}`) : undefined

  // Filtro por área. Áreas ordenadas para las tarjetas.
  const areasOrdenadas = React.useMemo(
    () =>
      [...areas].sort(
        (a, b) => a.piso.localeCompare(b.piso) || a.nombre.localeCompare(b.nombre),
      ),
    [areas],
  )
  const areaObjById = React.useMemo(() => {
    const m = new Map<string, Area>()
    areas.forEach((a) => m.set(a.id, a))
    return m
  }, [areas])
  // area_id asignado por acomodador y turno (para filtrar por el puesto real).
  const areaIdPorAcoSlot = React.useMemo(() => {
    const m = new Map<string, string>()
    asignaciones.forEach((a) =>
      m.set(`${a.acomodador_id}:${a.slot}`, a.area_id),
    )
    return m
  }, [asignaciones])
  // Turno relevante para el puesto: el seleccionado, o el actual en "Todos".
  const slotRelevante = selected === "todos" ? currentSlot : selected
  const areaSel = areaFiltro === "todas" ? null : areaObjById.get(areaFiltro)
  // Las áreas de los capitanes se guardan como "Piso — Nombre".
  const areaSelCapLabel = areaSel ? `${areaSel.piso} — ${areaSel.nombre}` : null
  const matchAreaCapitan = (c: Capitan) =>
    areaFiltro === "todas" ||
    (areaSelCapLabel != null && c.area.includes(areaSelCapLabel))
  const matchAreaAco = (a: Acomodador) => {
    if (areaFiltro === "todas") return true
    if (
      slotRelevante &&
      areaIdPorAcoSlot.get(`${a.id}:${slotRelevante}`) === areaFiltro
    )
      return true
    const cap = a.capitan_id ? capitanById.get(a.capitan_id) : null
    return !!(cap && areaSelCapLabel != null && cap.area.includes(areaSelCapLabel))
  }
  const matchAreaHer = (h: Hermana) => {
    if (areaFiltro === "todas") return true
    const cap = h.capitan_id ? capitanById.get(h.capitan_id) : null
    return !!(cap && areaSelCapLabel != null && cap.area.includes(areaSelCapLabel))
  }

  // Búsqueda por nombre, número o área (la propia del capitán, o la de su
  // capitán para acomodadores/hermanas).
  const matchCapitan = (c: Capitan) =>
    coincideBusqueda(busqueda, c.nombre, c.apellido, c.telefono, c.area.join(" "))
  const matchAcoHer = (p: Acomodador) => {
    const cap = p.capitan_id ? capitanById.get(p.capitan_id) : null
    return coincideBusqueda(
      busqueda,
      p.nombre,
      p.apellido,
      p.telefono,
      p.congregacion,
      cap ? `${cap.nombre} ${cap.apellido}` : null,
      cap ? cap.area.join(" ") : null,
    )
  }
  const fCapitanes = capitanes.filter(matchCapitan).filter(matchAreaCapitan)
  const fAcomodadores = acomodadores.filter(matchAcoHer).filter(matchAreaAco)
  const fHermanas = hermanas.filter(matchAcoHer).filter(matchAreaHer)
  const fSelCapitanes = selectedCapitanes
    .filter(matchCapitan)
    .filter(matchAreaCapitan)
  const fSelAcomodadores = selectedAcomodadores
    .filter(matchAcoHer)
    .filter(matchAreaAco)
  const fSelHermanas = selectedHermanas.filter(matchAcoHer).filter(matchAreaHer)

  const selectedLabel = ALL_SLOTS.find((s) => s.slot === selected)
  const totalSelected =
    selectedCapitanes.length +
    selectedAcomodadores.length +
    selectedHermanas.length

  const totalAll = capitanes.length + acomodadores.length + hermanas.length

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
      {/* Mobile slot picker — horizontal scrolling chips */}
      {!isDesktopSm && (
        <nav className="-mx-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-1">
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
      )}

      <div
        className="grid flex-1 gap-4"
        style={{
          gridTemplateColumns: isDesktopSm
            ? "minmax(180px, 280px) minmax(0, 1fr)"
            : "1fr",
        }}
      >
        {isDesktopSm && (
        <aside className="rounded-xl border bg-surface">
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
        )}

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

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex flex-wrap self-start rounded-full border bg-background p-0.5 text-xs sm:self-auto">
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
            <div className="flex-1">
              <BuscadorPersonal
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar por nombre, número o área…"
              />
            </div>
            {selected !== "todos" && origin && (
              <CopyAsistenciaLinkButton
                url={`${origin}/asistencia/${asamblea.id}/${selected}`}
              />
            )}
          </div>

          {areasOrdenadas.length > 0 && (
            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0 sm:pb-0">
              <AreaFiltroChip
                label="Todas"
                active={areaFiltro === "todas"}
                onClick={() => setAreaFiltro("todas")}
              />
              {areasOrdenadas.map((a) => (
                <AreaFiltroChip
                  key={a.id}
                  label={a.nombre}
                  piso={a.piso}
                  active={areaFiltro === a.id}
                  onClick={() => setAreaFiltro(a.id)}
                />
              ))}
            </div>
          )}

          {selected === "todos" ? (
            <div
              className="mt-6 grid grid-cols-1 gap-6"
            >
              {showCapitanes && (
                <Group
                  title="Capitanes"
                  empty="Ningún capitán registrado."
                  count={fCapitanes.length}
                >
                  {fCapitanes.map((c) => (
                    <MatrixRow
                      key={c.id}
                      title={`${c.nombre} ${c.apellido}`}
                      subtitle={c.area.join(", ")}
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
                  count={fAcomodadores.length}
                >
                  {fAcomodadores.map((a) => {
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
                        puesto={puestoActual(a.id)}
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
                  count={fHermanas.length}
                >
                  {fHermanas.map((h) => {
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
                  count={fSelCapitanes.length}
                  rightLabel="Confirmación de asistencia"
                >
                  {fSelCapitanes.map((c) => {
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
                        subtitle={c.area.join(", ")}
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
                  count={fSelAcomodadores.length}
                  rightLabel="Confirmación de asistencia"
                >
                  {fSelAcomodadores.map((a) => {
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
                        puesto={puestoPorAcoSlot.get(`${a.id}:${selected}`)}
                        whatsappUrl={buildDisponibilidadShareUrl(
                          origin,
                          "/acomodador/",
                          a.access_token,
                          a.telefono,
                          a.nombre,
                        )}
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
                  count={fSelHermanas.length}
                  rightLabel="Confirmación de asistencia"
                >
                  {fSelHermanas.map((h) => {
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
                        whatsappUrl={buildDisponibilidadShareUrl(
                          origin,
                          "/hermana-apoyo/",
                          h.access_token,
                          h.telefono,
                          h.nombre,
                        )}
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

function CopyAsistenciaLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted"
      title={url}
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
      {copied ? "Copiado" : "Copiar enlace de asistencia"}
    </button>
  )
}

function AreaFiltroChip({
  label,
  piso,
  active,
  onClick,
}: {
  label: string
  piso?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      <span className="font-medium">{label}</span>
      {piso && (
        <span
          className={cn(
            active ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {piso}
        </span>
      )}
    </button>
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
  puesto,
  whatsappUrl,
  confirmed,
  selfConfirmed,
  onToggle,
}: {
  title: string
  subtitle: string
  telefono: string
  puesto?: string
  whatsappUrl?: string
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
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {title}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
          <TelefonoButton telefono={telefono} />
          {puesto && (
            <span className="truncate text-xs text-primary">
              Puesto: {puesto}
            </span>
          )}
          {selfConfirmed && (
            <span className="mt-1 inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-primary">
              Confirmado por el acomodador
            </span>
          )}
        </div>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Enviar enlace de disponibilidad por WhatsApp"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircleIcon className="size-4" />
          </a>
        )}
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

/** Número que, al tocarlo, pregunta si marcar o abrir WhatsApp. */
function TelefonoButton({ telefono }: { telefono: string }) {
  const [open, setOpen] = React.useState(false)
  const tel = telefono.replace(/\D/g, "")
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(true)
        }}
        className="w-fit max-w-full truncate text-left text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {telefono}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{telefono}</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cómo quieres contactar a este número?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                window.open(
                  `https://wa.me/${tel}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              WhatsApp
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                window.location.href = `tel:${tel}`
              }}
            >
              Marcar
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
  puesto,
  disponibilidad,
  confirmadas,
}: {
  title: string
  subtitle: string
  telefono: string
  puesto?: string
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
          <TelefonoButton telefono={telefono} />
          {puesto && (
            <span className="truncate text-xs text-primary">
              Puesto: {puesto}
            </span>
          )}
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
