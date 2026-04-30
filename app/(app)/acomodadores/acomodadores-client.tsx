"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  MessageCircleIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  agregarAcomodadorManual,
  crearEnlaceRegistro,
  regenerarAcceso,
} from "./actions"

type Asamblea = {
  id: string
  numero: string
  edicion: string
  titulo: string
}

type Acomodador = {
  id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  notas: string | null
  access_token: string
  device_bound_at: string | null
  created_at: string
}

export function AcomodadoresClient({
  asamblea,
  acomodadores,
}: {
  asamblea: Asamblea
  acomodadores: Acomodador[]
}) {
  const router = useRouter()
  const [shareOpen, setShareOpen] = React.useState(false)
  const [enlaceToken, setEnlaceToken] = React.useState<string | null>(null)
  const [creatingEnlace, setCreatingEnlace] = React.useState(false)
  const [shareError, setShareError] = React.useState<string | null>(null)
  const [manualOpen, setManualOpen] = React.useState(false)

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const inviteUrl = enlaceToken
    ? `${origin}/registro/acomodadores/${enlaceToken}`
    : ""

  function openShare() {
    setEnlaceToken(null)
    setShareError(null)
    setShareOpen(true)
  }

  async function generarEnlace() {
    setShareError(null)
    setCreatingEnlace(true)
    const { token, error } = await crearEnlaceRegistro(asamblea.id)
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
          <h2 className="text-lg font-semibold">Acomodadores</h2>
          <p className="text-sm text-muted-foreground">
            {acomodadores.length} hermano
            {acomodadores.length === 1 ? "" : "s"} registrado
            {acomodadores.length === 1 ? "" : "s"} ·{" "}
            <span className="text-foreground/70">
              Asamblea N° {asamblea.numero} — {asamblea.edicion}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => setManualOpen(true)}
            className="w-full sm:w-auto"
          >
            <PlusIcon />
            Agregar manualmente
          </Button>
          <Button type="button" onClick={openShare} className="w-full sm:w-auto">
            <LinkIcon />
            Compartir enlace de registro
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Congregación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Acceso</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acomodadores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aún no se ha registrado ningún acomodador. Comparte el enlace
                  para empezar.
                </TableCell>
              </TableRow>
            ) : (
              acomodadores.map((a) => (
                <AcomodadorRow
                  key={a.id}
                  acomodador={a}
                  asambleaId={asamblea.id}
                />
              ))
            )}
          </TableBody>
        </Table>
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
        onCreated={() => router.refresh()}
      />
    </div>
  )
}

function ManualAddDialog({
  open,
  onOpenChange,
  asambleaId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
  onCreated: () => void
}) {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createdToken, setCreatedToken] = React.useState<string | null>(null)
  const [createdInfo, setCreatedInfo] = React.useState<{
    nombre: string
    telefono: string
  } | null>(null)
  const [copied, setCopied] = React.useState(false)

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const accessUrl = createdToken ? `${origin}/acomodador/${createdToken}` : ""

  React.useEffect(() => {
    if (!open) {
      setError(null)
      setCreatedToken(null)
      setCreatedInfo(null)
      setCopied(false)
    }
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
    }
    setSubmitting(true)
    setError(null)
    const { accessToken, error: err } = await agregarAcomodadorManual(
      asambleaId,
      values,
    )
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setCreatedToken(accessToken)
    setCreatedInfo({ nombre: values.nombre, telefono: values.telefono })
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
              <DialogTitle>Agregar acomodador</DialogTitle>
              <DialogDescription>
                Llena los datos del hermano. Al guardar te damos su enlace
                personal para que se lo compartas.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="nombre" label="Nombre" placeholder="Juan" required />
                <Field
                  name="apellido"
                  label="Apellido"
                  placeholder="Pérez"
                  required
                />
              </div>
              <Field
                name="congregacion"
                label="Congregación"
                placeholder="Centro"
                required
              />
              <Field
                name="telefono"
                label="Teléfono"
                type="tel"
                placeholder="+52 55 1234 5678"
                required
              />
              <Field
                name="notas"
                label="Notas"
                placeholder="Disponibilidad, restricciones, etc."
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Acomodador creado</DialogTitle>
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
}: {
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
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
            Envíalo a los hermanos. Al abrirlo desde su teléfono llenan sus
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

function AcomodadorRow({
  acomodador,
  asambleaId,
}: {
  acomodador: Acomodador
  asambleaId: string
}) {
  const router = useRouter()
  const [regenerating, setRegenerating] = React.useState(false)
  const [accessToken, setAccessToken] = React.useState<string>(
    acomodador.access_token,
  )
  const [accessOpen, setAccessOpen] = React.useState(false)

  async function handleRegenerar() {
    setRegenerating(true)
    const { token, error } = await regenerarAcceso(
      asambleaId,
      acomodador.telefono,
    )
    setRegenerating(false)
    if (error) {
      alert(error)
      return
    }
    if (token) setAccessToken(token)
    router.refresh()
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          {acomodador.nombre} {acomodador.apellido}
        </TableCell>
        <TableCell>{acomodador.congregacion}</TableCell>
        <TableCell>
          <a
            href={`https://wa.me/${acomodador.telefono.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {acomodador.telefono}
          </a>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {acomodador.device_bound_at ? "Activo" : "Sin abrir"}
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

      <AccessDialog
        open={accessOpen}
        onOpenChange={setAccessOpen}
        acomodador={acomodador}
        accessToken={accessToken}
        regenerating={regenerating}
        onRegenerar={handleRegenerar}
      />
    </>
  )
}

function AccessDialog({
  open,
  onOpenChange,
  acomodador,
  accessToken,
  regenerating,
  onRegenerar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  acomodador: Acomodador
  accessToken: string
  regenerating: boolean
  onRegenerar: () => void
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}/acomodador/${accessToken}`
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
            Acceso de {acomodador.nombre} {acomodador.apellido}
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
                acomodador.telefono,
                acomodador.nombre,
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
            {acomodador.device_bound_at
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
  const text = `Hola ${nombre}, este es tu enlace personal de acceso para los acomodadores. Funciona solo en el primer dispositivo donde lo abras: ${url}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
