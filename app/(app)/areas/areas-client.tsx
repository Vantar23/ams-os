"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react"

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
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMediaQuery } from "@/lib/use-media-query"

import {
  actualizarArea,
  agregarArea,
  asignarCapitanArea,
  eliminarArea,
} from "./actions"

type Asamblea = { id: string; numero: string; edicion: string }

export type Area = {
  id: string
  piso: string
  nombre: string
  filas: number
  acomodadores_necesarios: number
  hermanas_necesarias: number
  capacidad: number
  created_at: string
}

export type Capitan = {
  id: string
  nombre: string
  apellido: string
  area: string[] | null
}

function areaLabel(area: Pick<Area, "piso" | "nombre">): string {
  return `${area.piso} — ${area.nombre}`
}

function capitanNombre(c: Capitan): string {
  return `${c.nombre} ${c.apellido}`
}

export function AreasClient({
  asamblea,
  areas,
  capitanes,
}: {
  asamblea: Asamblea
  areas: Area[]
  capitanes: Capitan[]
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [mobileCardsContainer, setMobileCardsContainer] =
    React.useState<HTMLDivElement | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // capitanes.area guarda etiquetas "piso — nombre"; agrupamos los capitanes
  // que cubren cada área para mostrar el asignado y marcar las que no tienen.
  const capitanesPorArea = React.useMemo(() => {
    const map = new Map<string, Capitan[]>()
    for (const c of capitanes) {
      for (const label of c.area ?? []) {
        const list = map.get(label) ?? []
        list.push(c)
        map.set(label, list)
      }
    }
    return map
  }, [capitanes])

  const capitanesDeArea = React.useCallback(
    (area: Area) => capitanesPorArea.get(areaLabel(area)) ?? [],
    [capitanesPorArea],
  )
  const sinCapitan = areas.filter((a) => capitanesDeArea(a).length === 0).length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {areas.length} área{areas.length === 1 ? "" : "s"} registrada
            {areas.length === 1 ? "" : "s"}
            {sinCapitan > 0 && (
              <>
                {" · "}
                <span className="text-amber-600 dark:text-amber-500">
                  {sinCapitan} sin capitán
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="w-full sm:w-auto"
          >
            <PlusIcon />
            Agregar área
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div style={{ display: isDesktop ? "block" : "none" }}>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Piso</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Filas</TableHead>
                <TableHead>Acomodadores necesarios</TableHead>
                <TableHead>Hermanas necesarias</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Capitán</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin áreas. Agrega la primera para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((a) => (
                  <AreaRow
                    key={a.id}
                    area={a}
                    asignados={capitanesDeArea(a)}
                    capitanes={capitanes}
                    mobileCardsContainer={mobileCardsContainer}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards */}
      <div style={{ display: isDesktop ? "none" : "block" }}>
        <div ref={setMobileCardsContainer} className="grid gap-2">
          {areas.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Sin áreas. Agrega la primera para comenzar.
            </div>
          )}
        </div>
      </div>

      <AreaFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        asambleaId={asamblea.id}
      />
    </div>
  )
}

function CapitanCell({
  asignados,
  onAssign,
}: {
  asignados: Capitan[]
  onAssign: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAssign}
      className="inline-flex items-center gap-1.5 rounded-md text-left text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {asignados.length === 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-500">
          <UserPlusIcon className="size-3" />
          Asignar capitán
        </span>
      ) : (
        <span className="text-foreground">
          {asignados.map(capitanNombre).join(", ")}
        </span>
      )}
    </button>
  )
}

function AreaRow({
  area,
  asignados,
  capitanes,
  mobileCardsContainer,
}: {
  area: Area
  asignados: Capitan[]
  capitanes: Capitan[]
  mobileCardsContainer: HTMLElement | null
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  async function handleEliminar() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await eliminarArea(area.id)
    setDeleting(false)
    if (error) {
      setDeleteError(error)
      return
    }
    setDeleteOpen(false)
    router.refresh()
  }

  const contextItems = (
    <ContextMenuContent>
      <ContextMenuItem onSelect={() => setEditOpen(true)}>
        <PencilIcon />
        Editar
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => setAssignOpen(true)}>
        <UserPlusIcon />
        Asignar capitán
      </ContextMenuItem>
      <ContextMenuItem
        variant="destructive"
        onSelect={() => setDeleteOpen(true)}
      >
        <Trash2Icon />
        Eliminar
      </ContextMenuItem>
    </ContextMenuContent>
  )

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TableRow>
            <TableCell className="font-medium">{area.piso}</TableCell>
            <TableCell>{area.nombre}</TableCell>
            <TableCell>{area.filas}</TableCell>
            <TableCell>{area.acomodadores_necesarios}</TableCell>
            <TableCell>{area.hermanas_necesarias}</TableCell>
            <TableCell>{area.capacidad}</TableCell>
            <TableCell className="text-muted-foreground">
              <CapitanCell
                asignados={asignados}
                onAssign={() => setAssignOpen(true)}
              />
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <PencilIcon />
                Editar
              </Button>
            </TableCell>
          </TableRow>
        </ContextMenuTrigger>
        {contextItems}
      </ContextMenu>

      {mobileCardsContainer &&
        createPortal(
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <article className="rounded-xl border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-medium">
                      {area.nombre}
                    </h3>
                    <p className="text-xs text-muted-foreground">{area.piso}</p>
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Filas</dt>
                    <dd>{area.filas}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      Acomodadores necesarios
                    </dt>
                    <dd>{area.acomodadores_necesarios}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      Hermanas necesarias
                    </dt>
                    <dd>{area.hermanas_necesarias}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Capacidad</dt>
                    <dd>{area.capacidad}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Capitán</dt>
                    <dd className="text-right">
                      <CapitanCell
                        asignados={asignados}
                        onAssign={() => setAssignOpen(true)}
                      />
                    </dd>
                  </div>
                </dl>
              </article>
            </ContextMenuTrigger>
            {contextItems}
          </ContextMenu>,
          mobileCardsContainer,
        )}

      <AreaFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        area={area}
      />

      {assignOpen && (
        <AsignarCapitanDialog
          open
          onOpenChange={setAssignOpen}
          area={area}
          capitanes={capitanes}
          asignados={asignados}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar el área {area.nombre}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleEliminar()
              }}
              disabled={deleting}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function AsignarCapitanDialog({
  open,
  onOpenChange,
  area,
  capitanes,
  asignados,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  area: Area
  capitanes: Capitan[]
  asignados: Capitan[]
}) {
  const router = useRouter()
  const label = areaLabel(area)
  const [selected, setSelected] = React.useState<string | null>(
    asignados[0]?.id ?? null,
  )
  const [query, setQuery] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const filtrados = q
    ? capitanes.filter((c) => capitanNombre(c).toLowerCase().includes(q))
    : capitanes

  async function handleGuardar() {
    setSaving(true)
    setError(null)
    const { error: err } = await asignarCapitanArea(area.id, selected)
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    router.refresh()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar capitán</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        {capitanes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay capitanes registrados. Regístralos en la sección
            Capitanes para poder asignarlos.
          </p>
        ) : (
          <div className="grid gap-3">
            <Input
              placeholder="Buscar capitán…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
              <CapitanOption
                nombre="Sin capitán"
                detalle="Dejar el área sin capitán asignado"
                active={selected === null}
                onSelect={() => setSelected(null)}
              />
              {filtrados.map((c) => {
                const otras = (c.area ?? []).filter((l) => l !== label)
                return (
                  <CapitanOption
                    key={c.id}
                    nombre={capitanNombre(c)}
                    detalle={
                      otras.length === 0
                        ? "Aún no tiene áreas asignadas"
                        : `Ya tiene: ${otras.join(", ")}`
                    }
                    active={selected === c.id}
                    onSelect={() => setSelected(c.id)}
                  />
                )
              })}
              {filtrados.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Ningún capitán coincide con la búsqueda.
                </p>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={saving || capitanes.length === 0}
            className="w-full sm:w-auto"
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CapitanOption({
  nombre,
  detalle,
  active,
  onSelect,
}: {
  nombre: string
  detalle: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{nombre}</p>
        <p className="truncate text-xs text-muted-foreground">{detalle}</p>
      </div>
      {active && <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />}
    </button>
  )
}

type FormProps =
  | {
      open: boolean
      onOpenChange: (v: boolean) => void
      mode: "add"
      asambleaId: string
    }
  | {
      open: boolean
      onOpenChange: (v: boolean) => void
      mode: "edit"
      area: Area
    }

function AreaFormDialog(props: FormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const area = props.mode === "edit" ? props.area : null

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional al cerrar el diálogo
    if (!props.open) setError(null)
  }, [props.open])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const piso = String(fd.get("piso") ?? "").trim()
    const nombre = String(fd.get("nombre") ?? "").trim()
    const filas = Number(fd.get("filas") ?? 0)
    const acomodadoresNecesarios = Number(
      fd.get("acomodadoresNecesarios") ?? 0,
    )
    const hermanasNecesarias = Number(fd.get("hermanasNecesarias") ?? 0)
    const capacidad = Number(fd.get("capacidad") ?? 0)

    if (!piso || !nombre) {
      setError("Piso y área son requeridos.")
      return
    }
    if (
      Number.isNaN(filas) ||
      Number.isNaN(acomodadoresNecesarios) ||
      Number.isNaN(hermanasNecesarias) ||
      Number.isNaN(capacidad) ||
      filas < 0 ||
      acomodadoresNecesarios < 0 ||
      hermanasNecesarias < 0 ||
      capacidad < 0
    ) {
      setError(
        "Filas, acomodadores, hermanas y capacidad deben ser números ≥ 0.",
      )
      return
    }

    setSubmitting(true)
    setError(null)
    const values = {
      piso,
      nombre,
      filas,
      acomodadoresNecesarios,
      hermanasNecesarias,
      capacidad,
    }
    const { error: err } =
      props.mode === "add"
        ? await agregarArea(props.asambleaId, values)
        : await actualizarArea(props.area.id, values)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    router.refresh()
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {props.mode === "add" ? "Nueva área" : "Editar área"}
          </DialogTitle>
          <DialogDescription>
            Registra un piso y una zona del lugar de la asamblea con sus
            necesidades.
          </DialogDescription>
        </DialogHeader>
        <form
          key={area?.id ?? "new"}
          onSubmit={onSubmit}
          className="grid gap-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="piso">Piso</Label>
            <Input
              id="piso"
              name="piso"
              placeholder="Planta baja"
              defaultValue={area?.piso ?? ""}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nombre">Área</Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Sala principal"
              defaultValue={area?.nombre ?? ""}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="filas">Filas</Label>
              <Input
                id="filas"
                name="filas"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={area?.filas ?? 0}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="capacidad">Capacidad</Label>
              <Input
                id="capacidad"
                name="capacidad"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={area?.capacidad ?? 0}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acomodadoresNecesarios">
                Acomodadores necesarios
              </Label>
              <Input
                id="acomodadoresNecesarios"
                name="acomodadoresNecesarios"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={area?.acomodadores_necesarios ?? 0}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hermanasNecesarias">Hermanas necesarias</Label>
              <Input
                id="hermanasNecesarias"
                name="hermanasNecesarias"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={area?.hermanas_necesarias ?? 0}
              />
            </div>
          </div>

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
