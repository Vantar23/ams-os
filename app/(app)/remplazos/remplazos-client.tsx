"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, UserRoundXIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { slotLabelCorto } from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

import { realizarReemplazo } from "./actions"

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

type Asamblea = { id: string; numero: string; edicion: string }

export type Pendiente = {
  asignacionId: string
  nombre: string
  congregacion: string
  slot: string
  puesto: string
  marcadoAt: string | null
}

export type Candidato = {
  id: string
  nombre: string
  congregacion: string
  disponibilidad: string[]
  // slot -> true cuando ya tiene puesto en ese turno.
  ocupadoEn: Record<string, boolean>
}

export type RegistroReemplazo = {
  id: string
  saliente: string
  entrante: string
  puesto: string
  createdAt: string
}

function formatHora(iso: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    })
  } catch {
    return ""
  }
}

export function RemplazosClient({
  asamblea,
  pendientes,
  candidatos,
  historial,
}: {
  asamblea: Asamblea
  pendientes: Pendiente[]
  candidatos: Candidato[]
  historial: RegistroReemplazo[]
}) {
  const [elegir, setElegir] = React.useState<Pendiente | null>(null)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div>
        <h2 className="text-lg font-semibold">Remplazos</h2>
        <p className="text-sm text-muted-foreground">
          Asamblea N° {asamblea.numero} — {asamblea.edicion}
        </p>
      </div>

      <section className="rounded-xl border bg-surface p-4">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Pendientes de reemplazo ({pendientes.length})
        </h3>
        {pendientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay acomodadores marcados como “necesita reemplazo”. Cuando un
            capitán marque a alguien ausente, aparecerá aquí.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {pendientes.map((p) => (
              <li
                key={p.asignacionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <UserRoundXIcon className="size-4 shrink-0 text-destructive" />
                    {p.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.congregacion}
                    {p.congregacion && " · "}
                    {p.puesto}
                    {p.marcadoAt && ` · marcado ${formatHora(p.marcadoAt)}`}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => setElegir(p)}>
                  Elegir reemplazo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-surface p-4">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Historial de reemplazos ({historial.length})
        </h3>
        {historial.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no se ha hecho ningún reemplazo.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {historial.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="text-muted-foreground line-through">
                  {r.saliente}
                </span>
                <ArrowRightIcon className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{r.entrante}</span>
                <span className="text-xs text-muted-foreground">· {r.puesto}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatHora(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ElegirReemplazoDialog
        key={elegir?.asignacionId ?? "none"}
        pendiente={elegir}
        candidatos={candidatos}
        onOpenChange={(open) => {
          if (!open) setElegir(null)
        }}
      />
    </div>
  )
}

function ElegirReemplazoDialog({
  pendiente,
  candidatos,
  onOpenChange,
}: {
  pendiente: Pendiente | null
  candidatos: Candidato[]
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [submitting, setSubmitting] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const slot = pendiente?.slot ?? ""
  const searchNorm = stripAccents(search.trim().toLowerCase())

  const lista = React.useMemo(() => {
    const filtered = candidatos
      .filter((c) => {
        if (!searchNorm) return true
        return stripAccents(`${c.nombre} ${c.congregacion}`.toLowerCase()).includes(
          searchNorm,
        )
      })
      // Disponibles para este turno primero, luego no ocupados.
      .sort((a, b) => {
        const da = Number(a.disponibilidad.includes(slot))
        const db = Number(b.disponibilidad.includes(slot))
        if (da !== db) return db - da
        return a.nombre.localeCompare(b.nombre)
      })
    return filtered
  }, [candidatos, searchNorm, slot])

  async function elegir(c: Candidato) {
    if (!pendiente || submitting) return
    setSubmitting(c.id)
    setError(null)
    const { error: err } = await realizarReemplazo({
      asignacionId: pendiente.asignacionId,
      entranteId: c.id,
    })
    setSubmitting(null)
    if (err) {
      setError(err)
      return
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={pendiente !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elegir reemplazo</DialogTitle>
          <DialogDescription>
            {pendiente
              ? `Sustituir a ${pendiente.nombre} en ${pendiente.puesto}. El acomodador que elijas tomará el puesto.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o congregación"
          aria-label="Buscar acomodador"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <ul className="max-h-[50vh] divide-y overflow-y-auto">
          {lista.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No hay acomodadores que coincidan.
            </li>
          ) : (
            lista.map((c) => {
              const disponible = c.disponibilidad.includes(slot)
              const ocupado = c.ocupadoEn[slot] === true
              return (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.nombre}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {c.congregacion}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          disponible
                            ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {disponible
                          ? `Disponible ${slotLabelCorto(slot)}`
                          : "Sin disponibilidad"}
                      </span>
                      {ocupado && (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                          Ya tiene puesto este turno
                        </span>
                      )}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={disponible ? "default" : "outline"}
                    disabled={submitting !== null}
                    onClick={() => elegir(c)}
                  >
                    {submitting === c.id ? "…" : "Elegir"}
                  </Button>
                </li>
              )
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
