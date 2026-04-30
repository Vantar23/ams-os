"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { DisponibilidadSelector } from "@/components/disponibilidad-selector"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  actualizarCapitan,
  agregarCapitan,
  crearEnlaceRegistroCapitan,
  eliminarCapitan,
  generarAccesoCapitan,
} from "./actions"
import { AREAS_CAPITAN, type AreaCapitan } from "./areas"

type Asamblea = {
  id: string
  numero: string
  edicion: string
  titulo: string
}

export type Capitan = {
  id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  area: AreaCapitan
  notas: string | null
  disponibilidad: string[]
  user_id: string | null
  created_at: string
}

export function CapitanesClient({
  asamblea,
  capitanes,
}: {
  asamblea: Asamblea
  capitanes: Capitan[]
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [enlaceToken, setEnlaceToken] = React.useState<string | null>(null)
  const [creatingEnlace, setCreatingEnlace] = React.useState(false)
  const [shareError, setShareError] = React.useState<string | null>(null)
  const [mobileCardsContainer, setMobileCardsContainer] =
    React.useState<HTMLDivElement | null>(null)

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const inviteUrl = enlaceToken
    ? `${origin}/registro/capitanes/${enlaceToken}`
    : ""

  function openShare() {
    setEnlaceToken(null)
    setShareError(null)
    setShareOpen(true)
  }

  async function generarEnlace() {
    setShareError(null)
    setCreatingEnlace(true)
    const { token, error } = await crearEnlaceRegistroCapitan(asamblea.id)
    setCreatingEnlace(false)
    if (error) {
      setShareError(error)
      return
    }
    setEnlaceToken(token)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Capitanes</h2>
          <p className="text-sm text-muted-foreground">
            {capitanes.length} capit{capitanes.length === 1 ? "án" : "anes"}{" "}
            registrado{capitanes.length === 1 ? "" : "s"} ·{" "}
            <span className="text-foreground/70">
              Asamblea N° {asamblea.numero} — {asamblea.edicion}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={openShare}
            className="w-full sm:w-auto"
          >
            <LinkIcon />
            Compartir enlace de registro
          </Button>
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="w-full sm:w-auto"
          >
            <PlusIcon />
            Agregar capitán
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Congregación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capitanes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sin capitanes. Agrega el primero para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              capitanes.map((c) => (
                <CapitanRow
                  key={c.id}
                  capitan={c}
                  mobileCardsContainer={mobileCardsContainer}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards target */}
      <div
        ref={setMobileCardsContainer}
        className="grid gap-2 md:hidden"
      >
        {capitanes.length === 0 && (
          <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
            Sin capitanes. Agrega el primero para comenzar.
          </div>
        )}
      </div>

      <CapitanFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        asambleaId={asamblea.id}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        inviteUrl={inviteUrl}
        token={enlaceToken}
        creating={creatingEnlace}
        error={shareError}
        onGenerar={generarEnlace}
      />
    </div>
  )
}

function ShareDialog({
  open,
  onOpenChange,
  inviteUrl,
  token,
  creating,
  error,
  onGenerar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  inviteUrl: string
  token: string | null
  creating: boolean
  error: string | null
  onGenerar: () => void
}) {
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir enlace de registro</DialogTitle>
          <DialogDescription>
            Envíalo al hermano. Al abrirlo crea su cuenta de capitán y queda
            ligado a la asamblea. El enlace es válido por 3 días.
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <div className="grid gap-3 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              onClick={onGenerar}
              disabled={creating}
              className="w-full"
            >
              {creating ? "Generando…" : "Generar enlace"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Enlace
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteUrl}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label={copied ? "Copiado" : "Copiar enlace"}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Caduca en 3 días. Cualquier persona con el enlace podrá
              registrarse antes de esa fecha.
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {token ? (
            <Button
              type="button"
              variant="link"
              onClick={onGenerar}
              disabled={creating}
              className="px-0 text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              {creating ? "Generando…" : "Generar otro enlace"}
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CapitanRow({
  capitan,
  mobileCardsContainer,
}: {
  capitan: Capitan
  mobileCardsContainer: HTMLElement | null
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [accesoOpen, setAccesoOpen] = React.useState(false)
  const [accesoToken, setAccesoToken] = React.useState<string | null>(null)
  const [accesoLoading, setAccesoLoading] = React.useState(false)
  const [accesoError, setAccesoError] = React.useState<string | null>(null)

  async function handleEliminar() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await eliminarCapitan(capitan.id)
    setDeleting(false)
    if (error) {
      setDeleteError(error)
      return
    }
    setDeleteOpen(false)
    router.refresh()
  }

  async function handleAbrirAcceso() {
    setAccesoOpen(true)
    setAccesoError(null)
    if (accesoToken) return
    setAccesoLoading(true)
    const { token, error } = await generarAccesoCapitan(capitan.id)
    setAccesoLoading(false)
    if (error) {
      setAccesoError(error)
      return
    }
    setAccesoToken(token)
  }

  async function handleRegenerarAcceso() {
    setAccesoLoading(true)
    setAccesoError(null)
    const { token, error } = await generarAccesoCapitan(capitan.id)
    setAccesoLoading(false)
    if (error) {
      setAccesoError(error)
      return
    }
    setAccesoToken(token)
  }

  const accesoLabel = capitan.user_id ? "Restablecer acceso" : "Generar acceso"

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
            <TableCell className="font-medium">
              {capitan.nombre} {capitan.apellido}
            </TableCell>
            <TableCell>{capitan.congregacion}</TableCell>
            <TableCell>
              <a
                href={`https://wa.me/${capitan.telefono.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {capitan.telefono}
              </a>
            </TableCell>
            <TableCell>{capitan.area}</TableCell>
            <TableCell className="text-muted-foreground">
              {capitan.notas || "—"}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAbrirAcceso}
              >
                <LinkIcon />
                {accesoLabel}
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-medium">
                      {capitan.nombre} {capitan.apellido}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {capitan.congregacion}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {capitan.area}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd>
                      <a
                        href={`https://wa.me/${capitan.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {capitan.telefono}
                      </a>
                    </dd>
                  </div>
                  {capitan.notas && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Notas</dt>
                      <dd className="max-w-[60%] truncate text-right">
                        {capitan.notas}
                      </dd>
                    </div>
                  )}
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={handleAbrirAcceso}
                >
                  <LinkIcon />
                  {accesoLabel}
                </Button>
              </article>
            </ContextMenuTrigger>
            {contextItems}
          </ContextMenu>,
          mobileCardsContainer,
        )}

      <CapitanFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        capitan={capitan}
      />

      <AccesoDialog
        open={accesoOpen}
        onOpenChange={setAccesoOpen}
        capitan={capitan}
        token={accesoToken}
        loading={accesoLoading}
        error={accesoError}
        onRegenerar={handleRegenerarAcceso}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar a {capitan.nombre} {capitan.apellido}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Los acomodadores ligados a este capitán quedarán sin capitán
              asignado. Esta acción no se puede deshacer.
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

function AccesoDialog({
  open,
  onOpenChange,
  capitan,
  token,
  loading,
  error,
  onRegenerar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  capitan: Capitan
  token: string | null
  loading: boolean
  error: string | null
  onRegenerar: () => void
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = token ? `${origin}/restablecer/capitanes/${token}` : ""
  const [copied, setCopied] = React.useState(false)

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Acceso de {capitan.nombre} {capitan.apellido}
          </DialogTitle>
          <DialogDescription>
            Comparte este enlace para que active su cuenta o restablezca su
            contraseña. El enlace caduca en 3 días o al usarse.
          </DialogDescription>
        </DialogHeader>

        {loading && !token ? (
          <p className="py-6 text-sm text-muted-foreground">
            Generando enlace…
          </p>
        ) : token ? (
          <div className="grid gap-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Enlace
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label={copied ? "Copiado" : "Copiar enlace"}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>
            <Button asChild className="w-full">
              <a
                href={whatsappResetShareUrl(
                  capitan.telefono,
                  capitan.nombre,
                  url,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircleIcon />
                Enviar por WhatsApp
              </a>
            </Button>
          </div>
        ) : null}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="link"
            onClick={onRegenerar}
            disabled={loading}
            className="px-0 text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            {loading ? "Generando…" : "Generar otro enlace"}
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      capitan: Capitan
    }

type DraftDatos = {
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  notas: string
}

function CapitanFormDialog(props: FormProps) {
  const router = useRouter()
  const cap = props.mode === "edit" ? props.capitan : null
  const initialArea: AreaCapitan = cap?.area ?? "Entrada"
  const initialDisponibilidad = (cap?.disponibilidad ?? []) as DisponibilidadSlot[]

  const [step, setStep] = React.useState<"datos" | "disponibilidad">("datos")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [area, setArea] = React.useState<AreaCapitan>(initialArea)
  const [disponibilidad, setDisponibilidad] =
    React.useState<DisponibilidadSlot[]>(initialDisponibilidad)
  const [datos, setDatos] = React.useState<DraftDatos | null>(null)

  React.useEffect(() => {
    if (!props.open) {
      setStep("datos")
      setError(null)
      setArea(initialArea)
      setDisponibilidad(initialDisponibilidad)
      setDatos(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open])

  function readDatos(form: HTMLFormElement): DraftDatos {
    const fd = new FormData(form)
    return {
      nombre: String(fd.get("nombre") ?? "").trim(),
      apellido: String(fd.get("apellido") ?? "").trim(),
      congregacion: String(fd.get("congregacion") ?? "").trim(),
      telefono: String(fd.get("telefono") ?? "").trim(),
      notas: String(fd.get("notas") ?? "").trim(),
    }
  }

  async function persist(values: DraftDatos) {
    setSubmitting(true)
    setError(null)
    const payload = { ...values, area, disponibilidad }
    const { error: err } =
      props.mode === "add"
        ? (await agregarCapitan(props.asambleaId, payload))
        : (await actualizarCapitan(props.capitan.id, payload))
    setSubmitting(false)
    if (err) {
      setError(err)
      if (props.mode === "add") setStep("datos")
      return
    }
    router.refresh()
    props.onOpenChange(false)
  }

  async function onDatosSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = readDatos(e.currentTarget)
    if (props.mode === "add") {
      setDatos(values)
      setError(null)
      setStep("disponibilidad")
      return
    }
    await persist(values)
  }

  async function onDisponibilidadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!datos) return
    await persist(datos)
  }

  const isAdd = props.mode === "add"
  const showDisponibilidadStep = isAdd && step === "disponibilidad"

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAdd ? "Nuevo capitán" : "Editar capitán"}
            {isAdd && (
              <span className="ml-2 text-xs font-normal uppercase tracking-[0.15em] text-muted-foreground">
                Paso {showDisponibilidadStep ? "2" : "1"} de 2
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {showDisponibilidadStep
              ? "Marca las sesiones en las que puede servir."
              : "Registra al hermano encargado de un área durante la asamblea."}
          </DialogDescription>
        </DialogHeader>

        {!showDisponibilidadStep ? (
          <form
            key={cap?.id ?? "new-datos"}
            onSubmit={onDatosSubmit}
            className="grid gap-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="nombre"
                label="Nombre"
                placeholder="Carlos"
                required
                defaultValue={datos?.nombre ?? cap?.nombre}
              />
              <Field
                name="apellido"
                label="Apellido"
                placeholder="López"
                required
                defaultValue={datos?.apellido ?? cap?.apellido}
              />
            </div>
            <Field
              name="congregacion"
              label="Congregación"
              placeholder="Centro"
              required
              defaultValue={datos?.congregacion ?? cap?.congregacion}
            />
            <Field
              name="telefono"
              label="Teléfono"
              type="tel"
              inputMode="tel"
              noSpaces
              placeholder="5512345678"
              required
              defaultValue={datos?.telefono ?? cap?.telefono}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="area">Área a cargo</Label>
              <Select
                value={area}
                onValueChange={(v) => setArea(v as AreaCapitan)}
              >
                <SelectTrigger id="area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS_CAPITAN.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              name="notas"
              label="Notas"
              placeholder="Particularidades del área, etc."
              defaultValue={datos?.notas ?? cap?.notas ?? ""}
            />

            {!isAdd && (
              <div className="grid gap-2">
                <Label>Disponibilidad</Label>
                <DisponibilidadSelector
                  value={disponibilidad}
                  onChange={setDisponibilidad}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {isAdd
                  ? "Continuar"
                  : submitting
                    ? "Guardando…"
                    : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={onDisponibilidadSubmit} className="grid gap-4">
            <DisponibilidadSelector
              value={disponibilidad}
              onChange={setDisponibilidad}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError(null)
                  setStep("datos")
                }}
                disabled={submitting}
              >
                <ArrowLeftIcon />
                Atrás
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? "Guardando…" : "Guardar capitán"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  name,
  label,
  type,
  placeholder,
  required,
  defaultValue,
  inputMode,
  noSpaces,
}: {
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"]
  noSpaces?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        onKeyDown={
          noSpaces
            ? (e) => {
                if (e.key === " ") e.preventDefault()
              }
            : undefined
        }
      />
    </div>
  )
}

function whatsappResetShareUrl(
  telefono: string,
  nombre: string,
  url: string,
): string {
  const phone = telefono.replace(/\D/g, "")
  const text = `Hola ${nombre}, este es tu enlace para activar tu cuenta de capitán o restablecer tu contraseña: ${url}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
