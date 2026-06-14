"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react"

import { agregarAcomodadorManual } from "@/app/(app)/acomodadores/actions"
import { agregarHermanaManual } from "@/app/(app)/hermanas-de-apoyo/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  currentDiaSesion,
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadDia,
  type DisponibilidadSesion,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"
import { createRealtimeClient } from "@/lib/supabase/realtime"
import { useMediaQuery } from "@/lib/use-media-query"
import { cn } from "@/lib/utils"

import {
  asignarPuesto,
  asignarPuestoHermana,
  quitarPuesto,
  quitarPuestoHermana,
} from "./actions"

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

type Asamblea = { id: string; numero: string; edicion: string }

type Area = {
  id: string
  piso: string
  nombre: string
  filas: number
  acomodadores_necesarios: number
  hermanas_necesarias: number
  capacidad: number
}

type Persona = {
  id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  disponibilidad: string[]
  capitan_id: string | null
}

type Capitan = {
  id: string
  nombre: string
  apellido: string
  // Etiquetas "piso — nombre" de las áreas del capitán (capitanes.area).
  area: string[]
}

type Asignacion = {
  acomodador_id: string
  area_id: string
  slot: string
}

type AsignacionHermana = {
  hermana_apoyo_id: string
  area_id: string
  slot: string
}

type Rol = "acomodadores" | "hermanas"

type ManualAddAction = (
  asambleaId: string,
  values: {
    nombre: string
    apellido: string
    congregacion: string
    telefono: string
    notas: string
    capitanId: string | null
    disponibilidad: string[]
  },
) => Promise<{ accessToken: string | null; error: string | null }>

type RolConfig = {
  rol: Rol
  personas: Persona[]
  // Map<persona_id, area_id> for the current slot, only persisted values.
  asignacionPorPersona: { personaId: string; areaId: string; slot: string }[]
  necesarios: (area: Area) => number
  asignar: (personaId: string, areaId: string) => Promise<{ error: string | null }>
  quitar: (personaId: string) => Promise<{ error: string | null }>
  manualAdd: ManualAddAction
  // Etiquetas (género): "acomodador"/"hermana", "acomodadores"/"hermanas".
  singular: string
  plural: string
}

type LocalState = {
  // Map<persona_id, areaId | null> for the currently selected slot.
  // null = unassigned. Missing key = use persisted value.
  overrides: Record<string, string | null>
}

const ROLES: { key: Rol; label: string }[] = [
  { key: "acomodadores", label: "Acomodadores" },
  { key: "hermanas", label: "Hermanas de apoyo" },
]

export function PuestosClient({
  asamblea,
  areas,
  acomodadores,
  asignaciones,
  hermanas,
  asignacionesHermanas,
  capitanes,
}: {
  asamblea: Asamblea
  areas: Area[]
  acomodadores: Persona[]
  asignaciones: Asignacion[]
  hermanas: Persona[]
  asignacionesHermanas: AsignacionHermana[]
  capitanes: Capitan[]
}) {
  const router = useRouter()
  const [rol, setRol] = React.useState<Rol>("acomodadores")
  const [dia, setDia] = React.useState<DisponibilidadDia>("viernes")
  const [sesion, setSesion] = React.useState<DisponibilidadSesion>("manana")
  // Preselecciona día y turno según la fecha/hora del cliente (al montar, para
  // no provocar mismatch de hidratación si el servidor está en otra zona).
  React.useEffect(() => {
    const { dia, sesion } = currentDiaSesion()
    setDia(dia)
    setSesion(sesion)
  }, [])
  const [areaId, setAreaId] = React.useState<string>(areas[0]?.id ?? "")
  const [state, setState] = React.useState<LocalState>({ overrides: {} })
  const [quickAddOpen, setQuickAddOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  // En móvil las listas no caben lado a lado; esta pestaña elige cuál se ve.
  const [vista, setVista] = React.useState<"sin" | "asignados">("sin")
  const isDesktop = useMediaQuery("(min-width: 768px)")
  // Wizard de 3 pasos solo en móvil: 1) día/turno/rol 2) asignar 3) faltantes.
  const [paso, setPaso] = React.useState<1 | 2 | 3>(1)
  const searchNorm = stripAccents(search.trim().toLowerCase())
  function matchesSearch(p: Persona): boolean {
    if (!searchNorm) return true
    const full = stripAccents(
      `${p.nombre} ${p.apellido} ${p.congregacion}`.toLowerCase(),
    )
    return full.includes(searchNorm)
  }

  const slot = `${dia}-${sesion}` as DisponibilidadSlot
  const area = areas.find((a) => a.id === areaId) ?? null
  const diaLabel = DISPONIBILIDAD_DIAS.find((d) => d.key === dia)?.label ?? ""
  const sesionLabel =
    DISPONIBILIDAD_SESIONES.find((s) => s.key === sesion)?.label ?? ""
  const rolLabel = rol === "hermanas" ? "Hermanas de apoyo" : "Acomodadores"

  const cfg: RolConfig = React.useMemo(() => {
    if (rol === "hermanas") {
      return {
        rol,
        personas: hermanas,
        asignacionPorPersona: asignacionesHermanas.map((a) => ({
          personaId: a.hermana_apoyo_id,
          areaId: a.area_id,
          slot: a.slot,
        })),
        necesarios: (a: Area) => a.hermanas_necesarias,
        asignar: (personaId: string, targetAreaId: string) =>
          asignarPuestoHermana({
            asambleaId: asamblea.id,
            areaId: targetAreaId,
            hermanaId: personaId,
            slot,
          }),
        quitar: (personaId: string) =>
          quitarPuestoHermana({ hermanaId: personaId, slot }),
        manualAdd: agregarHermanaManual,
        singular: "hermana",
        plural: "hermanas",
      }
    }
    return {
      rol,
      personas: acomodadores,
      asignacionPorPersona: asignaciones.map((a) => ({
        personaId: a.acomodador_id,
        areaId: a.area_id,
        slot: a.slot,
      })),
      necesarios: (a: Area) => a.acomodadores_necesarios,
      asignar: (personaId: string, targetAreaId: string) =>
        asignarPuesto({
          asambleaId: asamblea.id,
          areaId: targetAreaId,
          acomodadorId: personaId,
          slot,
        }),
      quitar: (personaId: string) =>
        quitarPuesto({ acomodadorId: personaId, slot }),
      manualAdd: agregarAcomodadorManual,
      singular: "acomodador",
      plural: "acomodadores",
    }
  }, [
    rol,
    acomodadores,
    hermanas,
    asignaciones,
    asignacionesHermanas,
    asamblea.id,
    slot,
  ])

  // Persisted assignment for this persona in the current slot.
  const persistedAreaFor = React.useMemo(() => {
    const map = new Map<string, string | null>()
    for (const a of cfg.asignacionPorPersona) {
      if (a.slot === slot) map.set(a.personaId, a.areaId)
    }
    return map
  }, [cfg.asignacionPorPersona, slot])

  function currentAreaFor(personaId: string): string | null {
    if (personaId in state.overrides) return state.overrides[personaId]
    return persistedAreaFor.get(personaId) ?? null
  }

  // Reset overrides when slot or rol changes (assignments live per slot+rol).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia los cambios locales al cambiar de turno/rol
    setState({ overrides: {} })
  }, [slot, rol])

  // Suscripción realtime: dos personas pueden asignar a la vez y cada una ve
  // los cambios de la otra sin recargar. Necesita el JWT del usuario (sin él,
  // RLS no entrega eventos). Sondeo de respaldo + refresco al enfocar por si el
  // socket falla. Cubre ambas tablas porque la pestaña de rol comparte pantalla.
  React.useEffect(() => {
    let cancelado = false
    let cleanup: (() => void) | null = null
    createRealtimeClient().then((supabase) => {
      if (cancelado) return
      const channel = supabase
        .channel(`puestos-${asamblea.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "asignaciones",
            filter: `asamblea_id=eq.${asamblea.id}`,
          },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "asignaciones_hermanas",
            filter: `asamblea_id=eq.${asamblea.id}`,
          },
          () => router.refresh(),
        )
        .subscribe()
      cleanup = () => {
        supabase.removeChannel(channel)
      }
    })
    const interval = setInterval(() => router.refresh(), 15000)
    const onFocus = () => router.refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelado = true
      cleanup?.()
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [asamblea.id, router])

  // Descarta los cambios locales que ya coinciden con lo persistido. Así, una
  // vez confirmada mi acción, si la otra persona mueve a alguien, su cambio se
  // refleja (el override deja de tapar el dato del servidor).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconcilia los cambios locales con lo persistido tras un refresco
    setState((s) => {
      const keys = Object.keys(s.overrides)
      if (keys.length === 0) return s
      let changed = false
      const next = { ...s.overrides }
      for (const personaId of keys) {
        const persisted = persistedAreaFor.get(personaId) ?? null
        if (persisted === next[personaId]) {
          delete next[personaId]
          changed = true
        }
      }
      return changed ? { overrides: next } : s
    })
  }, [persistedAreaFor])

  async function asignar(personaId: string) {
    if (!area) return
    setState((s) => ({
      overrides: { ...s.overrides, [personaId]: area.id },
    }))
    const { error } = await cfg.asignar(personaId, area.id)
    if (error) {
      setState((s) => {
        const copy = { ...s.overrides }
        delete copy[personaId]
        return { overrides: copy }
      })
      alert(error)
      return
    }
    router.refresh()
  }

  async function quitar(personaId: string) {
    setState((s) => ({
      overrides: { ...s.overrides, [personaId]: null },
    }))
    const { error } = await cfg.quitar(personaId)
    if (error) {
      setState((s) => {
        const copy = { ...s.overrides }
        delete copy[personaId]
        return { overrides: copy }
      })
      alert(error)
      return
    }
    router.refresh()
  }

  // Group personas for the current slot.
  const asignadosAEsta: Persona[] = []
  const sinAsignar: Persona[] = []
  const enOtraArea: { persona: Persona; areaId: string }[] = []

  for (const p of cfg.personas) {
    const current = currentAreaFor(p.id)
    if (current === area?.id && current) {
      asignadosAEsta.push(p)
    } else if (current && current !== area?.id) {
      enOtraArea.push({ persona: p, areaId: current })
    } else {
      sinAsignar.push(p)
    }
  }

  const areaById = new Map(areas.map((a) => [a.id, a]))

  // Capitán de cada persona y si su área coincide con la seleccionada.
  // Solo orientativo para asignar de un vistazo; nunca bloquea nada.
  const capitanById = new Map(capitanes.map((c) => [c.id, c]))
  const areaLabelActual = area ? `${area.piso} — ${area.nombre}` : null
  const capitanesDeArea = areaLabelActual
    ? capitanes.filter((c) => c.area.includes(areaLabelActual))
    : []
  function capitanDe(p: Persona) {
    const cap = p.capitan_id ? capitanById.get(p.capitan_id) : null
    if (!cap) return null
    return {
      cap,
      enEstaArea:
        areaLabelActual !== null && cap.area.includes(areaLabelActual),
    }
  }
  function capitanLinea(p: Persona) {
    const info = capitanDe(p)
    if (!info) return null
    return (
      <span
        className={cn(
          "truncate text-xs",
          info.enEstaArea ? "text-primary" : "text-muted-foreground",
        )}
      >
        Cap. {info.cap.nombre} {info.cap.apellido}
        {info.cap.area.length > 0 && ` · ${info.cap.area.join(", ")}`}
      </span>
    )
  }

  // Per-area headcount for current slot.
  const headcountByArea = new Map<string, number>()
  for (const p of cfg.personas) {
    const target = currentAreaFor(p.id)
    if (!target) continue
    headcountByArea.set(target, (headcountByArea.get(target) ?? 0) + 1)
  }

  const areaShortfalls = areas.map((a) => {
    const asignados = headcountByArea.get(a.id) ?? 0
    const necesarios = cfg.necesarios(a)
    const faltan = Math.max(0, necesarios - asignados)
    return { area: a, asignados, necesarios, faltan }
  })

  const totalFaltantes = areaShortfalls.reduce((s, x) => s + x.faltan, 0)

  const necesariosArea = area ? cfg.necesarios(area) : 0

  const rolSwitcher = (
    <div className="inline-flex rounded-full border bg-background p-0.5 text-sm">
      {ROLES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setRol(r.key)}
          className={cn(
            "rounded-full px-4 py-1.5 transition-colors",
            rol === r.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )

  // Chips de áreas (con su nivel y faltante). "scroll" = fila deslizable
  // compacta (selector del paso 2); "wrap" = envuelven y llenan la pantalla
  // (faltantes en móvil) y se acomodan en varias líneas en escritorio.
  function areaChips(variant: "scroll" | "wrap", onPick?: () => void) {
    const items = areaShortfalls.map(
      ({ area: a, asignados, necesarios, faltan }) => {
        const active = a.id === areaId
        const short = faltan > 0
        const complete = !short && necesarios > 0
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              setAreaId(a.id)
              onPick?.()
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background hover:bg-muted",
              short &&
                !active &&
                "border-destructive/40 bg-destructive/5 text-destructive",
              short && active && "border-destructive",
              complete && !active && "border-primary/50 bg-primary/10 text-primary",
              complete && active && "border-primary",
            )}
          >
            <span className="font-medium">{a.nombre}</span>
            <span className="text-muted-foreground">{a.piso}</span>
            <span
              className={cn(
                "tabular-nums",
                short
                  ? "text-destructive"
                  : complete
                    ? "text-primary"
                    : "text-muted-foreground",
              )}
            >
              {asignados}/{necesarios}
            </span>
            {short && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                -{faltan}
              </span>
            )}
            {complete && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                OK
              </span>
            )}
          </button>
        )
      },
    )
    return (
      <div
        className={cn(
          "mt-3 flex gap-2",
          variant === "scroll"
            ? "-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
            : "flex-wrap",
        )}
      >
        {items}
      </div>
    )
  }

  if (areas.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Aún no hay áreas. Agrega un área primero para poder asignar puestos.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Filters: día, turno, rol (paso 1 en móvil) */}
      <div
        className={cn(
          "flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-3 sm:gap-4 sm:p-4",
          !isDesktop && paso !== 1 && "hidden",
        )}
      >
        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Día
          </Label>
          <div className="inline-flex rounded-full border bg-background p-0.5 text-sm">
            {DISPONIBILIDAD_DIAS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDia(d.key)}
                className={cn(
                  "rounded-full px-4 py-1.5 transition-colors",
                  dia === d.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Turno
          </Label>
          <div className="inline-flex rounded-full border bg-background p-0.5 text-sm">
            {DISPONIBILIDAD_SESIONES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSesion(s.key)}
                className={cn(
                  "rounded-full px-4 py-1.5 transition-colors",
                  sesion === s.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5 sm:ml-auto">
          <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Rol
          </Label>
          {rolSwitcher}
        </div>
      </div>

      {!isDesktop && paso === 1 && (
        <Button size="lg" className="w-full" onClick={() => setPaso(2)}>
          Siguiente
          <ArrowRightIcon />
        </Button>
      )}

      {!isDesktop && paso === 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="-mb-2 self-start"
          onClick={() => setPaso(2)}
        >
          <ArrowLeftIcon />
          Atrás
        </Button>
      )}

      {/* Faltantes resumen (paso 3 en móvil) */}
      <section
        className={cn(
          "rounded-xl border bg-surface p-4",
          !isDesktop && paso !== 3 && "hidden",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Faltantes en este turno
          </h3>
          <p
            className={cn(
              "text-sm",
              totalFaltantes > 0
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {totalFaltantes === 0
              ? "Todas las áreas cubiertas"
              : `${totalFaltantes} ${totalFaltantes === 1 ? cfg.singular : cfg.plural} por asignar`}
          </p>
        </div>
        {/* Chips que envuelven y llenan la pantalla; tocar = ir a asignar. */}
        {areaChips("wrap", () => {
          if (!isDesktop) setPaso(2)
        })}
      </section>

      {area && (isDesktop || paso === 2) && (
        <>
          {!isDesktop && (
            <>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaso(1)}
                >
                  <ArrowLeftIcon />
                  Atrás
                </Button>
                <span className="truncate text-xs text-muted-foreground">
                  {diaLabel} · {sesionLabel} · {rolLabel}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaso(3)}
                >
                  Faltantes
                  <ArrowRightIcon />
                </Button>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Área
                </Label>
                {areaChips("scroll")}
              </div>
            </>
          )}
          {/* Pestañas solo en móvil: una lista a la vez, sin scroll eterno. */}
          <div className="grid grid-cols-2 rounded-full border bg-background p-0.5 text-sm md:hidden">
            <button
              type="button"
              onClick={() => setVista("sin")}
              className={cn(
                "rounded-full px-3 py-2 transition-colors",
                vista === "sin"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Sin asignar ({sinAsignar.length})
            </button>
            <button
              type="button"
              onClick={() => setVista("asignados")}
              className={cn(
                "rounded-full px-3 py-2 transition-colors",
                vista === "asignados"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Asignados ({asignadosAEsta.length}/{necesariosArea})
            </button>
          </div>

        <div
          className="grid items-start gap-4"
          style={{
            gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
          }}
        >
          {/* Asignados */}
          {(isDesktop || vista === "asignados") && (
          <section className="min-w-0 rounded-xl border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b pb-2">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Asignados a {area.nombre} ({asignadosAEsta.length} /{" "}
                {necesariosArea})
              </h3>
              {capitanesDeArea.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {capitanesDeArea.length === 1 ? "Capitán" : "Capitanes"}:{" "}
                  <span className="text-foreground">
                    {capitanesDeArea
                      .map((c) => `${c.nombre} ${c.apellido}`)
                      .join(", ")}
                  </span>
                </p>
              )}
            </div>
            {asignadosAEsta.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nadie asignado todavía. Asigna desde la lista de sin asignar.
              </p>
            ) : (
              <ul className="divide-y">
                {asignadosAEsta.filter(matchesSearch).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {p.nombre} {p.apellido}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {p.congregacion}
                      </span>
                      {capitanLinea(p)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => quitar(p.id)}
                    >
                      <MinusIcon />
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}

          {/* Sin asignar (+ otra area) */}
          {(isDesktop || vista === "sin") && (
          <section className="min-w-0 rounded-xl border bg-surface p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3 border-b pb-2">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Sin asignar ({sinAsignar.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAddOpen(true)}
              >
                <UserPlusIcon />
                Agregar {cfg.singular}
              </Button>
            </div>
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, apellido o congregación"
              className="mt-3"
              aria-label={`Buscar ${cfg.singular}`}
            />
            <div className="-mx-1 mt-1 max-h-[calc(100dvh-24rem)] min-h-[10rem] overflow-y-auto px-1 md:max-h-[60vh]">
            {sinAsignar.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {cfg.rol === "hermanas"
                  ? "Todas las hermanas ya tienen asignación para este turno."
                  : "Todos los acomodadores ya tienen asignación para este turno."}
              </p>
            ) : (
              (() => {
                const filtered = sinAsignar
                  .filter(matchesSearch)
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                // Primero los del capitán de esta área (sigue alfabético
                // dentro de cada grupo); es solo orden, no restricción.
                const disponibles = filtered
                  .filter((p) => p.disponibilidad.includes(slot))
                  .sort(
                    (a, b) =>
                      Number(capitanDe(b)?.enEstaArea ?? false) -
                      Number(capitanDe(a)?.enEstaArea ?? false),
                  )
                const noDisponibles = filtered.filter(
                  (p) => !p.disponibilidad.includes(slot),
                )
                const renderItem = (p: Persona) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {p.nombre} {p.apellido}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {p.congregacion}
                      </span>
                      {capitanLinea(p)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => asignar(p.id)}
                    >
                      <PlusIcon />
                      Asignar
                    </Button>
                  </li>
                )
                return (
                  <>
                    {disponibles.length > 0 && (
                      <>
                        <h4 className="mt-3 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                          Disponibles ({disponibles.length})
                        </h4>
                        <ul className="divide-y">
                          {disponibles.map(renderItem)}
                        </ul>
                      </>
                    )}
                    {noDisponibles.length > 0 && (
                      <>
                        <h4 className="mt-6 border-t pt-3 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                          Sin disponibilidad ({noDisponibles.length})
                        </h4>
                        <ul className="divide-y">
                          {noDisponibles.map(renderItem)}
                        </ul>
                      </>
                    )}
                  </>
                )
              })()
            )}

            {enOtraArea.length > 0 && (
              <details className="group mt-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b pb-2">
                  <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    En otra área ({enOtraArea.length})
                  </h4>
                  <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <ul className="divide-y">
                  {enOtraArea
                    .filter(({ persona }) => matchesSearch(persona))
                    .map(({ persona: p, areaId: aId }) => {
                    const otherArea = areaById.get(aId)
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {p.nombre} {p.apellido}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {otherArea
                              ? `Asignado en ${otherArea.nombre}`
                              : "Asignado en otra área"}
                          </span>
                          {capitanLinea(p)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => asignar(p.id)}
                        >
                          <PlusIcon />
                          Mover aquí
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </details>
            )}
            </div>
          </section>
          )}
        </div>
        </>
      )}

      <QuickAddDialog
        key={cfg.rol}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        asambleaId={asamblea.id}
        slot={slot}
        manualAdd={cfg.manualAdd}
        singular={cfg.singular}
        onCreated={() => router.refresh()}
      />
    </div>
  )
}

function QuickAddDialog({
  open,
  onOpenChange,
  asambleaId,
  slot,
  manualAdd,
  singular,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
  slot: DisponibilidadSlot
  manualAdd: ManualAddAction
  singular: string
  onCreated: () => void
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [includeCurrentSlot, setIncludeCurrentSlot] = React.useState(true)

  React.useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional al cerrar el diálogo
      setError(null)
      setIncludeCurrentSlot(true)
    }
  }, [open])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get("nombre") ?? "").trim()
    const apellido = String(fd.get("apellido") ?? "").trim()
    const congregacion = String(fd.get("congregacion") ?? "").trim()
    const telefono = String(fd.get("telefono") ?? "").trim()
    if (!nombre || !apellido || !congregacion || !telefono) {
      setError("Todos los campos son requeridos.")
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await manualAdd(asambleaId, {
      nombre,
      apellido,
      congregacion,
      telefono,
      notas: "",
      capitanId: null,
      disponibilidad: includeCurrentSlot ? [slot] : [],
    })
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar {singular}</DialogTitle>
          <DialogDescription>
            Lo agregamos al pool de &quot;Sin asignar&quot;. Puedes editar la
            disponibilidad o el capitán asignado más tarde desde la sección
            correspondiente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="qa-nombre">Nombre</Label>
              <Input id="qa-nombre" name="nombre" placeholder="Juan" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qa-apellido">Apellido</Label>
              <Input
                id="qa-apellido"
                name="apellido"
                placeholder="Pérez"
                required
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qa-congregacion">Congregación</Label>
            <Input
              id="qa-congregacion"
              name="congregacion"
              placeholder="Centro"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qa-telefono">Teléfono</Label>
            <Input
              id="qa-telefono"
              name="telefono"
              type="tel"
              inputMode="tel"
              placeholder="5512345678"
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault()
              }}
              required
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeCurrentSlot}
              onChange={(e) => setIncludeCurrentSlot(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              Marcarlo como disponible para este turno (
              <span className="text-foreground">{slot}</span>) para que aparezca
              listo para asignar.
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
