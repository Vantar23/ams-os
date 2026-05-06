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
import { useMediaQuery } from "@/lib/use-media-query"

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
  actualizarSubAux,
  agregarSubAux,
  crearEnlaceRegistroSubAux,
  eliminarSubAux,
  generarAccesoSubAux,
  type SubAuxRole,
} from "./actions"

type Asamblea = {
  id: string
  numero: string
  edicion: string
  titulo: string
}

export type AreaOption = {
  id: string
  piso: string
  nombre: string
}

export type SubAuxPersona = {
  id: string
  role: SubAuxRole
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  area: string
  notas: string | null
  disponibilidad: string[]
  user_id: string | null
  created_at: string
}

const ROLE_LABEL: Record<SubAuxRole, string> = {
  subcapitan: "Subcapitán",
  auxiliar: "Auxiliar",
}

function areaLabel(area: { piso: string; nombre: string }): string {
  return `${area.piso} — ${area.nombre}`
}

export function SubAuxClient({
  asamblea,
  personas,
  areas,
}: {
  asamblea: Asamblea
  personas: SubAuxPersona[]
  areas: AreaOption[]
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)
  const [mobileCardsContainer, setMobileCardsContainer] =
    React.useState<HTMLDivElement | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sub. y Aux.</h2>
          <p className="text-sm text-muted-foreground">
            {personas.length} registrado{personas.length === 1 ? "" : "s"} ·{" "}
            <span className="text-foreground/70">
              Asamblea N° {asamblea.numero} — {asamblea.edicion}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShareOpen(true)}
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
            Agregar
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div style={{ display: isDesktop ? "block" : "none" }}>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Congregación</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Sin registros. Agrega el primero para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                personas.map((p) => (
                  <SubAuxRow
                    key={p.id}
                    persona={p}
                    areas={areas}
                    mobileCardsContainer={mobileCardsContainer}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards target */}
      <div style={{ display: isDesktop ? "none" : "block" }}>
        <div ref={setMobileCardsContainer} className="grid gap-2">
          {personas.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Sin registros. Agrega el primero para comenzar.
            </div>
          )}
        </div>
      </div>

      <SubAuxFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        asambleaId={asamblea.id}
        areas={areas}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        asambleaId={asamblea.id}
      />
    </div>
  )
}

function ShareDialog({
  open,
  onOpenChange,
  asambleaId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
}) {
  const [role, setRole] = React.useState<SubAuxRole>("subcapitan")
  const [token, setToken] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setToken(null)
      setError(null)
      setCopied(false)
      setRole("subcapitan")
    }
  }, [open])

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const inviteUrl = token ? `${origin}/registro/sub-aux/${token}` : ""

  async function generar() {
    setError(null)
    setCreating(true)
    const { token: t, error: err } = await crearEnlaceRegistroSubAux(
      asambleaId,
      role,
    )
    setCreating(false)
    if (err) {
      setError(err)
      return
    }
    setToken(t)
  }

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
            Selecciona el rol del enlace. Al abrirlo, el hermano crea su cuenta
            con ese rol y queda ligado a la asamblea. El enlace es válido por 3
            días.
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as SubAuxRole)}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcapitan">Subcapitán</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              onClick={generar}
              disabled={creating}
              className="w-full"
            >
              {creating ? "Generando…" : "Generar enlace"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Enlace para {ROLE_LABEL[role]}
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
              onClick={() => {
                setToken(null)
                setCopied(false)
              }}
              className="px-0 text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              Generar otro
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

function SubAuxRow({
  persona,
  areas,
  mobileCardsContainer,
}: {
  persona: SubAuxPersona
  areas: AreaOption[]
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
    const { error } = await eliminarSubAux(persona.id)
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
    const { token, error } = await generarAccesoSubAux(persona.id)
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
    const { token, error } = await generarAccesoSubAux(persona.id)
    setAccesoLoading(false)
    if (error) {
      setAccesoError(error)
      return
    }
    setAccesoToken(token)
  }

  const accesoLabel = persona.user_id ? "Restablecer acceso" : "Generar acceso"

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
              {persona.nombre} {persona.apellido}
            </TableCell>
            <TableCell>{ROLE_LABEL[persona.role]}</TableCell>
            <TableCell>{persona.congregacion}</TableCell>
            <TableCell>
              <a
                href={`https://wa.me/${persona.telefono.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {persona.telefono}
              </a>
            </TableCell>
            <TableCell>{persona.area}</TableCell>
            <TableCell className="text-muted-foreground">
              {persona.notas || "—"}
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
                      {persona.nombre} {persona.apellido}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {persona.congregacion}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {ROLE_LABEL[persona.role]}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd>
                      <a
                        href={`https://wa.me/${persona.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {persona.telefono}
                      </a>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Área</dt>
                    <dd className="max-w-[60%] truncate text-right">
                      {persona.area}
                    </dd>
                  </div>
                  {persona.notas && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Notas</dt>
                      <dd className="max-w-[60%] truncate text-right">
                        {persona.notas}
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

      <SubAuxFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        persona={persona}
        areas={areas}
      />

      <AccesoDialog
        open={accesoOpen}
        onOpenChange={setAccesoOpen}
        persona={persona}
        token={accesoToken}
        loading={accesoLoading}
        error={accesoError}
        onRegenerar={handleRegenerarAcceso}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar a {persona.nombre} {persona.apellido}?
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

function AccesoDialog({
  open,
  onOpenChange,
  persona,
  token,
  loading,
  error,
  onRegenerar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  persona: SubAuxPersona
  token: string | null
  loading: boolean
  error: string | null
  onRegenerar: () => void
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = token ? `${origin}/restablecer/sub-aux/${token}` : ""
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
            Acceso de {persona.nombre} {persona.apellido}
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
                  persona.telefono,
                  persona.nombre,
                  ROLE_LABEL[persona.role],
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
      areas: AreaOption[]
    }
  | {
      open: boolean
      onOpenChange: (v: boolean) => void
      mode: "edit"
      persona: SubAuxPersona
      areas: AreaOption[]
    }

type DraftDatos = {
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  notas: string
}

function SubAuxFormDialog(props: FormProps) {
  const router = useRouter()
  const persona = props.mode === "edit" ? props.persona : null
  const areaOptions = props.areas.map((a) => ({ ...a, label: areaLabel(a) }))
  const initialArea: string = persona?.area ?? (areaOptions[0]?.label ?? "")
  const initialRole: SubAuxRole = persona?.role ?? "subcapitan"
  const initialDisponibilidad = (persona?.disponibilidad ?? []) as DisponibilidadSlot[]

  const [step, setStep] = React.useState<"datos" | "disponibilidad">("datos")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [role, setRole] = React.useState<SubAuxRole>(initialRole)
  const [area, setArea] = React.useState<string>(initialArea)
  const [disponibilidad, setDisponibilidad] =
    React.useState<DisponibilidadSlot[]>(initialDisponibilidad)
  const [datos, setDatos] = React.useState<DraftDatos | null>(null)

  React.useEffect(() => {
    if (!props.open) {
      setStep("datos")
      setError(null)
      setRole(initialRole)
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
    if (!area) {
      setError("Selecciona un área. Si no hay opciones, crea áreas primero.")
      if (props.mode === "add") setStep("datos")
      return
    }
    setSubmitting(true)
    setError(null)
    const payload = { ...values, role, area, disponibilidad }
    const { error: err } =
      props.mode === "add"
        ? await agregarSubAux(props.asambleaId, payload)
        : await actualizarSubAux(props.persona.id, payload)
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
            {isAdd ? "Nuevo registro" : "Editar registro"}
            {isAdd && (
              <span className="ml-2 text-xs font-normal uppercase tracking-[0.15em] text-muted-foreground">
                Paso {showDisponibilidadStep ? "2" : "1"} de 2
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {showDisponibilidadStep
              ? "Marca las sesiones en las que puede servir."
              : "Registra al hermano y selecciona si es subcapitán o auxiliar."}
          </DialogDescription>
        </DialogHeader>

        {!showDisponibilidadStep ? (
          <form
            key={persona?.id ?? "new-datos"}
            onSubmit={onDatosSubmit}
            className="grid gap-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as SubAuxRole)}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcapitan">Subcapitán</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="nombre"
                label="Nombre"
                placeholder="Carlos"
                required
                defaultValue={datos?.nombre ?? persona?.nombre}
              />
              <Field
                name="apellido"
                label="Apellido"
                placeholder="López"
                required
                defaultValue={datos?.apellido ?? persona?.apellido}
              />
            </div>
            <Field
              name="congregacion"
              label="Congregación"
              placeholder="Centro"
              required
              defaultValue={datos?.congregacion ?? persona?.congregacion}
            />
            <Field
              name="telefono"
              label="Teléfono"
              type="tel"
              inputMode="tel"
              noSpaces
              placeholder="5512345678"
              required
              defaultValue={datos?.telefono ?? persona?.telefono}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="area">Área a cargo</Label>
              {areaOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay áreas registradas. Crea áreas en Lugar &gt; Áreas
                  antes de continuar.
                </p>
              ) : (
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((a) => (
                      <SelectItem key={a.id} value={a.label}>
                        {a.label}
                      </SelectItem>
                    ))}
                    {area && !areaOptions.some((a) => a.label === area) && (
                      <SelectItem value={area}>{area}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Field
              name="notas"
              label="Notas"
              placeholder="Particularidades del área, etc."
              defaultValue={datos?.notas ?? persona?.notas ?? ""}
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
                {submitting ? "Guardando…" : "Guardar"}
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
  roleLabel: string,
  url: string,
): string {
  const phone = telefono.replace(/\D/g, "")
  const text = `Hola ${nombre}, este es tu enlace para activar tu cuenta de ${roleLabel.toLowerCase()} o restablecer tu contraseña: ${url}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
