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
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"

import { DisponibilidadSelector } from "@/components/disponibilidad-selector"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"
import { cn } from "@/lib/utils"

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
  actualizarHermana,
  agregarHermanaManual,
  crearEnlaceRegistroHermana,
  eliminarHermana,
  regenerarAccesoHermana,
} from "./actions"

type Asamblea = {
  id: string
  numero: string
  edicion: string
  titulo: string
}

type HermanaApoyo = {
  id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  notas: string | null
  access_token: string
  device_bound_at: string | null
  created_at: string
  capitan_id: string | null
  disponibilidad: string[]
}

type CapitanOption = {
  id: string
  nombre: string
  apellido: string
  area: string
}

const SIN_CAPITAN_VALUE = "__none__"

export function HermanasApoyoClient({
  asamblea,
  hermanas,
  capitanes,
  currentCapitanId,
}: {
  asamblea: Asamblea
  hermanas: HermanaApoyo[]
  capitanes: CapitanOption[]
  currentCapitanId: string | null
}) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = React.useState(false)
  const [enlaceToken, setEnlaceToken] = React.useState<string | null>(null)
  const [creatingEnlace, setCreatingEnlace] = React.useState(false)
  const [shareError, setShareError] = React.useState<string | null>(null)
  const [manualOpen, setManualOpen] = React.useState(false)
  const [mobileCardsContainer, setMobileCardsContainer] =
    React.useState<HTMLDivElement | null>(null)

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const inviteUrl = enlaceToken
    ? `${origin}/registro/hermanas-de-apoyo/${enlaceToken}`
    : ""

  function openShare() {
    setEnlaceToken(null)
    setShareError(null)
    setShareOpen(true)
  }

  async function generarEnlace() {
    setShareError(null)
    setCreatingEnlace(true)
    const { token, error } = await crearEnlaceRegistroHermana(asamblea.id)
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
          <h2 className="text-lg font-semibold">Hermanas de Apoyo</h2>
          <p className="text-sm text-muted-foreground">
            {hermanas.length} hermana
            {hermanas.length === 1 ? "" : "s"} registrada
            {hermanas.length === 1 ? "" : "s"} ·{" "}
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
            onClick={() => setManualOpen(true)}
            className="w-full sm:w-auto"
          >
            <PlusIcon />
            Agregar manualmente
          </Button>
        </div>
      </div>

      {/* Desktop table (hidden in mobile) */}
      <div className="show-on-desktop">
        <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Congregación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Capitán</TableHead>
              <TableHead>Acceso</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hermanas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aún no se ha registrado ninguna hermana. Comparte el enlace
                  para empezar.
                </TableCell>
              </TableRow>
            ) : (
              hermanas.map((a) => (
                <HermanaRow
                  key={a.id}
                  hermana={a}
                  asambleaId={asamblea.id}
                  capitanes={capitanes}
                  mobileCardsContainer={mobileCardsContainer}
                />
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Mobile cards target — actual cards portaled in from each row */}
      <div className="show-on-mobile">
        <div ref={setMobileCardsContainer} className="grid gap-2">
          {hermanas.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Aún no se ha registrado ninguna hermana. Comparte el enlace
              para empezar.
            </div>
          )}
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        inviteUrl={inviteUrl}
        token={enlaceToken}
        creating={creatingEnlace}
        error={shareError}
        onGenerar={generarEnlace}
      />

      <ManualAddDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        asambleaId={asamblea.id}
        capitanes={capitanes}
        defaultCapitanId={currentCapitanId}
        onCreated={() => router.refresh()}
      />
    </div>
  )
}

function ManualAddDialog({
  open,
  onOpenChange,
  asambleaId,
  capitanes,
  defaultCapitanId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
  capitanes: CapitanOption[]
  defaultCapitanId: string | null
  onCreated: () => void
}) {
  type DraftDatos = {
    nombre: string
    apellido: string
    congregacion: string
    telefono: string
    notas: string
  }

  const [step, setStep] = React.useState<"datos" | "disponibilidad">("datos")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createdToken, setCreatedToken] = React.useState<string | null>(null)
  const [createdInfo, setCreatedInfo] = React.useState<{
    nombre: string
    telefono: string
  } | null>(null)
  const [copied, setCopied] = React.useState(false)
  const initialCapitanId = defaultCapitanId ?? SIN_CAPITAN_VALUE
  const [capitanId, setCapitanId] = React.useState<string>(initialCapitanId)
  const [disponibilidad, setDisponibilidad] = React.useState<
    DisponibilidadSlot[]
  >([])
  const [datos, setDatos] = React.useState<DraftDatos | null>(null)

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const accessUrl = createdToken ? `${origin}/hermana-apoyo/${createdToken}` : ""

  React.useEffect(() => {
    if (!open) {
      setStep("datos")
      setError(null)
      setCreatedToken(null)
      setCreatedInfo(null)
      setCopied(false)
      setCapitanId(initialCapitanId)
      setDisponibilidad([])
      setDatos(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function onDatosSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const values: DraftDatos = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      apellido: String(fd.get("apellido") ?? "").trim(),
      congregacion: String(fd.get("congregacion") ?? "").trim(),
      telefono: String(fd.get("telefono") ?? "").trim(),
      notas: String(fd.get("notas") ?? "").trim(),
    }
    setDatos(values)
    setError(null)
    setStep("disponibilidad")
  }

  async function onDisponibilidadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!datos) return
    setSubmitting(true)
    setError(null)
    const { accessToken, error: err } = await agregarHermanaManual(
      asambleaId,
      {
        ...datos,
        capitanId: capitanId === SIN_CAPITAN_VALUE ? null : capitanId,
        disponibilidad,
      },
    )
    setSubmitting(false)
    if (err) {
      setError(err)
      setStep("datos")
      return
    }
    setCreatedToken(accessToken)
    setCreatedInfo({ nombre: datos.nombre, telefono: datos.telefono })
    onCreated()
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(accessUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignored */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>
                Agregar hermana
                <span className="ml-2 text-xs font-normal uppercase tracking-[0.15em] text-muted-foreground">
                  Paso {step === "disponibilidad" ? "2" : "1"} de 2
                </span>
              </DialogTitle>
              <DialogDescription>
                {step === "disponibilidad"
                  ? "Marca las sesiones en las que puede servir."
                  : "Llena los datos de la hermana. Al guardar te damos su enlace personal para que se lo compartas."}
              </DialogDescription>
            </DialogHeader>

            {step === "datos" ? (
              <form
                key="datos"
                onSubmit={onDatosSubmit}
                className="grid gap-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    name="nombre"
                    label="Nombre"
                    placeholder="Juan"
                    required
                    defaultValue={datos?.nombre}
                  />
                  <Field
                    name="apellido"
                    label="Apellido"
                    placeholder="Pérez"
                    required
                    defaultValue={datos?.apellido}
                  />
                </div>
                <Field
                  name="congregacion"
                  label="Congregación"
                  placeholder="Centro"
                  required
                  defaultValue={datos?.congregacion}
                />
                <Field
                  name="telefono"
                  label="Teléfono"
                  type="tel"
                  inputMode="tel"
                  noSpaces
                  placeholder="5512345678"
                  required
                  defaultValue={datos?.telefono}
                />
                <Field
                  name="notas"
                  label="Notas"
                  placeholder="Disponibilidad, restricciones, etc."
                  defaultValue={datos?.notas}
                />
                <CapitanSelector
                  capitanes={capitanes}
                  value={capitanId}
                  onChange={setCapitanId}
                />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto">
                    Continuar
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <form
                key="disponibilidad"
                onSubmit={onDisponibilidadSubmit}
                className="grid gap-4"
              >
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
                    {submitting ? "Guardando…" : "Guardar hermana"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Hermana de apoyo creada</DialogTitle>
              <DialogDescription>
                Comparte este enlace personal por WhatsApp. Solo funcionará en
                el primer dispositivo donde se abra.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Enlace de acceso
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={accessUrl}
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
              {createdInfo && (
                <Button asChild className="w-full">
                  <a
                    href={whatsappShareUrl(
                      createdInfo.telefono,
                      createdInfo.nombre,
                      accessUrl,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircleIcon />
                    Enviar por WhatsApp
                  </a>
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Listo
              </Button>
            </DialogFooter>
          </>
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

function EditDialog({
  open,
  onOpenChange,
  hermana,
  capitanes,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  hermana: HermanaApoyo
  capitanes: CapitanOption[]
  onSaved: () => void
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const initialCapitanId = hermana.capitan_id ?? SIN_CAPITAN_VALUE
  const initialDisponibilidad =
    (hermana.disponibilidad ?? []) as DisponibilidadSlot[]
  const [capitanId, setCapitanId] = React.useState<string>(initialCapitanId)
  const [disponibilidad, setDisponibilidad] = React.useState<
    DisponibilidadSlot[]
  >(initialDisponibilidad)

  React.useEffect(() => {
    if (!open) {
      setError(null)
      setCapitanId(initialCapitanId)
      setDisponibilidad(initialDisponibilidad)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const values = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      apellido: String(fd.get("apellido") ?? "").trim(),
      congregacion: String(fd.get("congregacion") ?? "").trim(),
      telefono: String(fd.get("telefono") ?? "").trim(),
      notas: String(fd.get("notas") ?? "").trim(),
      capitanId: capitanId === SIN_CAPITAN_VALUE ? null : capitanId,
      disponibilidad,
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await actualizarHermana(hermana.id, values)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    onSaved()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar hermana</DialogTitle>
          <DialogDescription>
            Actualiza los datos de la hermana. Su enlace de acceso no cambia.
          </DialogDescription>
        </DialogHeader>
        <form key={hermana.id} onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              name="nombre"
              label="Nombre"
              placeholder="Juan"
              required
              defaultValue={hermana.nombre}
            />
            <Field
              name="apellido"
              label="Apellido"
              placeholder="Pérez"
              required
              defaultValue={hermana.apellido}
            />
          </div>
          <Field
            name="congregacion"
            label="Congregación"
            placeholder="Centro"
            required
            defaultValue={hermana.congregacion}
          />
          <Field
            name="telefono"
            label="Teléfono"
            type="tel"
            inputMode="tel"
            noSpaces
            placeholder="5512345678"
            required
            defaultValue={hermana.telefono}
          />
          <Field
            name="notas"
            label="Notas"
            placeholder="Disponibilidad, restricciones, etc."
            defaultValue={hermana.notas ?? ""}
          />
          <CapitanSelector
            capitanes={capitanes}
            value={capitanId}
            onChange={setCapitanId}
          />
          <div className="grid gap-2">
            <Label>Disponibilidad</Label>
            <DisponibilidadSelector
              value={disponibilidad}
              onChange={setDisponibilidad}
            />
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

function CapitanSelector({
  capitanes,
  value,
  onChange,
}: {
  capitanes: CapitanOption[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="capitan_id">Capitán</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="capitan_id">
          <SelectValue placeholder="Sin capitán asignado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_CAPITAN_VALUE}>Sin capitán</SelectItem>
          {capitanes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nombre} {c.apellido} · {c.area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {capitanes.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aún no hay capitanes registrados.
        </p>
      )}
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
            Envíalo a los hermanas. Al abrirlo desde su teléfono llenan sus
            datos y aparecen aquí. El enlace es válido por 3 días.
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

function HermanaRow({
  hermana,
  asambleaId,
  capitanes,
  mobileCardsContainer,
}: {
  hermana: HermanaApoyo
  asambleaId: string
  capitanes: CapitanOption[]
  mobileCardsContainer: HTMLElement | null
}) {
  const capitan = hermana.capitan_id
    ? capitanes.find((c) => c.id === hermana.capitan_id)
    : null
  const router = useRouter()
  const [regenerating, setRegenerating] = React.useState(false)
  const [accessToken, setAccessToken] = React.useState<string>(
    hermana.access_token,
  )
  const [accessOpen, setAccessOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  async function handleRegenerar() {
    setRegenerating(true)
    const { token, error } = await regenerarAccesoHermana(
      asambleaId,
      hermana.telefono,
    )
    setRegenerating(false)
    if (error) {
      alert(error)
      return
    }
    if (token) setAccessToken(token)
    router.refresh()
  }

  async function handleEliminar() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await eliminarHermana(hermana.id)
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
            <TableCell className="font-medium">
              {hermana.nombre} {hermana.apellido}
            </TableCell>
            <TableCell>{hermana.congregacion}</TableCell>
            <TableCell>
              <a
                href={`https://wa.me/${hermana.telefono.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {hermana.telefono}
              </a>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {capitan ? (
                <span>
                  <span className="text-foreground">
                    {capitan.nombre} {capitan.apellido}
                  </span>{" "}
                  · {capitan.area}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {hermana.device_bound_at ? "Activo" : "Sin abrir"}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAccessOpen(true)}
              >
                <LinkIcon />
                Acceso
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
                      {hermana.nombre} {hermana.apellido}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hermana.congregacion}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
                      hermana.device_bound_at
                        ? "border-primary/40 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {hermana.device_bound_at ? "Activo" : "Sin abrir"}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd>
                      <a
                        href={`https://wa.me/${hermana.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {hermana.telefono}
                      </a>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Capitán</dt>
                    <dd className="text-right">
                      {capitan ? (
                        <span>
                          {capitan.nombre} {capitan.apellido}
                          <span className="block text-xs text-muted-foreground">
                            {capitan.area}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setAccessOpen(true)}
                >
                  <LinkIcon />
                  Acceso
                </Button>
              </article>
            </ContextMenuTrigger>
            {contextItems}
          </ContextMenu>,
          mobileCardsContainer,
        )}

      <AccessDialog
        open={accessOpen}
        onOpenChange={setAccessOpen}
        hermana={hermana}
        accessToken={accessToken}
        regenerating={regenerating}
        onRegenerar={handleRegenerar}
      />

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        hermana={hermana}
        capitanes={capitanes}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar a {hermana.nombre} {hermana.apellido}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará el registro y su enlace de acceso dejará de funcionar.
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

function AccessDialog({
  open,
  onOpenChange,
  hermana,
  accessToken,
  regenerating,
  onRegenerar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  hermana: HermanaApoyo
  accessToken: string
  regenerating: boolean
  onRegenerar: () => void
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}/hermana-apoyo/${accessToken}`
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Acceso de {hermana.nombre} {hermana.apellido}
          </DialogTitle>
          <DialogDescription>
            Enlace personal. Funciona solo en el primer dispositivo donde se
            abra. Si lo regeneras, el dispositivo anterior pierde el acceso.
          </DialogDescription>
        </DialogHeader>

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
              href={whatsappShareUrl(
                hermana.telefono,
                hermana.nombre,
                url,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircleIcon />
              Enviar por WhatsApp
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            {hermana.device_bound_at
              ? "Ya abierto en un dispositivo."
              : "Aún no se ha abierto en ningún dispositivo."}
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="link"
            onClick={onRegenerar}
            disabled={regenerating}
            className="px-0 text-xs uppercase tracking-[0.15em] text-muted-foreground"
          >
            <RefreshCwIcon />
            {regenerating ? "Regenerando…" : "Regenerar acceso"}
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

function whatsappShareUrl(telefono: string, nombre: string, url: string): string {
  const phone = telefono.replace(/\D/g, "")
  const text = `Hola ${nombre}, estás invitada a servir como hermana de apoyo en la asamblea. Este es tu enlace personal de registro y acceso a la plataforma. Funciona solo en el primer dispositivo donde lo abras: ${url}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
