"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

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

import { actualizarArea, agregarArea, eliminarArea } from "./actions"

type Asamblea = { id: string; numero: string; edicion: string }

export type Area = {
  id: string
  piso: string
  nombre: string
  filas: number
  acomodadores_necesarios: number
  capacidad: number
  created_at: string
}

export function AreasClient({
  asamblea,
  areas,
}: {
  asamblea: Asamblea
  areas: Area[]
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [mobileCardsContainer, setMobileCardsContainer] =
    React.useState<HTMLDivElement | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Áreas</h2>
          <p className="text-sm text-muted-foreground">
            {areas.length} área{areas.length === 1 ? "" : "s"} registrada
            {areas.length === 1 ? "" : "s"} ·{" "}
            <span className="text-foreground/70">
              Asamblea N° {asamblea.numero} — {asamblea.edicion}
            </span>
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
                <TableHead>Capacidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
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

function AreaRow({
  area,
  mobileCardsContainer,
}: {
  area: Area
  mobileCardsContainer: HTMLElement | null
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
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
            <TableCell>{area.capacidad}</TableCell>
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
                    <dt className="text-muted-foreground">Capacidad</dt>
                    <dd>{area.capacidad}</dd>
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
    const capacidad = Number(fd.get("capacidad") ?? 0)

    if (!piso || !nombre) {
      setError("Piso y área son requeridos.")
      return
    }
    if (
      Number.isNaN(filas) ||
      Number.isNaN(acomodadoresNecesarios) ||
      Number.isNaN(capacidad) ||
      filas < 0 ||
      acomodadoresNecesarios < 0 ||
      capacidad < 0
    ) {
      setError("Filas, acomodadores y capacidad deben ser números ≥ 0.")
      return
    }

    setSubmitting(true)
    setError(null)
    const values = {
      piso,
      nombre,
      filas,
      acomodadoresNecesarios,
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
          <div className="grid gap-3 sm:grid-cols-3">
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
              <Label htmlFor="acomodadoresNecesarios">Acomodadores</Label>
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
