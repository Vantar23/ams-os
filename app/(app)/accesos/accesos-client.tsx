"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  LinkIcon,
  MessageCircleIcon,
  PlusIcon,
  SmartphoneIcon,
  Trash2Icon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { crearArea, eliminarArea, eliminarPase, generarPase } from "./actions"

type Asamblea = { id: string; numero: string; edicion: string }

export type Area = {
  id: string
  nombre: string
  created_at: string
}

export type Pase = {
  id: string
  area_id: string
  access_token: string
  nombre: string | null
  telefono: string | null
  device_bound_at: string | null
  created_at: string
}

function paseUrl(token: string): string {
  if (typeof window === "undefined") return `/acceso/${token}`
  return `${window.location.origin}/acceso/${token}`
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Abre WhatsApp con el enlace listo para enviar. Sin número: deja que el admin
// elija el contacto al que se lo manda. Si hay teléfono, va directo a esa persona.
function whatsappShareUrl(
  areaNombre: string,
  url: string,
  nombre: string | null,
  telefono: string | null,
): string {
  const saludo = nombre ? `Hola ${nombre}` : "Hola"
  const text = `${saludo}, este es tu enlace de acceso a ${areaNombre}. Solo funcionará en el primer dispositivo donde lo abras: ${url}`
  const phone = (telefono ?? "").replace(/\D/g, "")
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/"
  return `${base}?text=${encodeURIComponent(text)}`
}

export function AccesosClient({
  asamblea,
  areas,
  pases,
}: {
  asamblea: Asamblea
  areas: Area[]
  pases: Pase[]
}) {
  const [addOpen, setAddOpen] = React.useState(false)

  const pasesPorArea = React.useMemo(() => {
    const map = new Map<string, Pase[]>()
    for (const p of pases) {
      const list = map.get(p.area_id) ?? []
      list.push(p)
      map.set(p.area_id, list)
    }
    return map
  }, [pases])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-sm text-muted-foreground">
          Comparte el acceso a áreas restringidas (palcos, departamentos, zonas
          de acceso controlado). Cada enlace que copias es único y se liga al
          primer dispositivo que lo abre: nunca funcionará en otro.
        </p>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <PlusIcon className="size-4" />
          Nueva área
        </Button>
      </div>

      {areas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed py-16">
          <div className="max-w-sm text-center">
            <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <KeyRoundIcon className="size-6" />
            </div>
            <h2 className="mt-4 font-serif text-xl">Sin áreas restringidas</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea un área (por ejemplo «Palco A» o «Departamentos») para empezar
              a generar enlaces de acceso.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              pases={pasesPorArea.get(area.id) ?? []}
              asambleaId={asamblea.id}
            />
          ))}
        </div>
      )}

      <NuevaAreaDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        asambleaId={asamblea.id}
      />
    </div>
  )
}

function AreaCard({
  area,
  pases,
  asambleaId,
}: {
  area: Area
  pases: Pase[]
  asambleaId: string
}) {
  const [shareOpen, setShareOpen] = React.useState(false)
  const [borrarArea, setBorrarArea] = React.useState(false)

  const ligados = pases.filter((p) => p.device_bound_at).length

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg leading-tight">
            {area.nombre}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pases.length} enlace{pases.length === 1 ? "" : "s"} ·{" "}
            {ligados} en uso
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={() => setShareOpen(true)}>
            <LinkIcon className="size-4" />
            Compartir enlace
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setBorrarArea(true)}
            aria-label="Eliminar área"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>

      {pases.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Aún no has generado enlaces para esta área. Pulsa «Compartir enlace»
          para crear uno y enviarlo.
        </p>
      ) : (
        <ul className="divide-y">
          {pases.map((p) => (
            <PaseRow key={p.id} pase={p} />
          ))}
        </ul>
      )}

      <CompartirDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        asambleaId={asambleaId}
        area={area}
      />

      <EliminarAreaDialog
        open={borrarArea}
        onOpenChange={setBorrarArea}
        area={area}
        tienePases={pases.length > 0}
      />
    </div>
  )
}

function CompartirDialog({
  open,
  onOpenChange,
  asambleaId,
  area,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
  area: Area
}) {
  const router = useRouter()
  const [token, setToken] = React.useState<string | null>(null)
  const [nombre, setNombre] = React.useState("")
  const [telefono, setTelefono] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const url = token ? paseUrl(token) : ""

  // Cada vez que se abre el diálogo arranca limpio: el enlace anterior ya no se
  // re-muestra (cada enlace es de un solo uso/dispositivo).
  function handleOpenChange(v: boolean) {
    if (!v) {
      setToken(null)
      setNombre("")
      setTelefono("")
      setError(null)
      setCopied(false)
    }
    onOpenChange(v)
  }

  // Acuña un pase NUEVO y único cada vez, registrando de quién es (nombre y
  // teléfono opcionales). Refresca la lista para que aparezca.
  async function generar() {
    setError(null)
    setCreating(true)
    const { token: nuevo, error: err } = await generarPase({
      asambleaId,
      areaId: area.id,
      nombre,
      telefono,
    })
    setCreating(false)
    if (!nuevo) {
      setError(err)
      return
    }
    setToken(nuevo)
    setCopied(false)
    router.refresh()
  }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir acceso a {area.nombre}</DialogTitle>
          <DialogDescription>
            Genera un enlace y envíalo a la persona. Se ligará al primer
            dispositivo donde lo abra y no funcionará en ningún otro.
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`tel-${area.id}`}>
                Teléfono{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id={`tel-${area.id}`}
                type="tel"
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="55 1234 5678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`nom-${area.id}`}>
                Nombre completo{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id={`nom-${area.id}`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de quien usará el acceso"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Sirve para saber de quién es el enlace. Si pones el teléfono,
              podrás enviárselo directo por WhatsApp.
            </p>
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
                  area.nombre,
                  url,
                  nombre.trim() || null,
                  telefono.trim() || null,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircleIcon />
                Enviar por WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              {nombre.trim()
                ? `Enlace para ${nombre.trim()}. Es único: para otra persona, genera otro distinto.`
                : "Este enlace es único. Para otra persona, genera otro distinto."}
            </p>
          </div>
        )}

        {error && token && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter className="sm:justify-between">
          {token ? (
            <Button
              type="button"
              variant="link"
              onClick={generar}
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
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaseRow({ pase }: { pase: Pase }) {
  const router = useRouter()
  const [borrar, setBorrar] = React.useState(false)
  const [copiado, setCopiado] = React.useState(false)
  const ligado = Boolean(pase.device_bound_at)

  async function onCopiar() {
    try {
      await navigator.clipboard.writeText(paseUrl(pase.access_token))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* ignored */
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full " +
            (ligado
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground")
          }
        >
          <SmartphoneIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {pase.nombre || (ligado ? "En uso" : "Sin abrir")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[
              pase.nombre ? (ligado ? "En uso" : "Sin abrir") : null,
              pase.telefono,
              ligado
                ? `ligado ${fechaCorta(pase.device_bound_at!)}`
                : `creado ${fechaCorta(pase.created_at)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!ligado && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onCopiar}
            aria-label="Copiar enlace"
            className="text-muted-foreground"
          >
            {copiado ? (
              <CheckIcon className="size-4 text-primary" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setBorrar(true)}
          aria-label="Revocar acceso"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <AlertDialog open={borrar} onOpenChange={setBorrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar este acceso</AlertDialogTitle>
            <AlertDialogDescription>
              {ligado
                ? "El dispositivo que lo está usando dejará de tener acceso de inmediato. Esta acción no se puede deshacer."
                : "El enlace dejará de funcionar de inmediato. Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await eliminarPase(pase.id)
                router.refresh()
              }}
            >
              Revocar acceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

function NuevaAreaDialog({
  open,
  onOpenChange,
  asambleaId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  asambleaId: string
}) {
  const router = useRouter()
  const [nombre, setNombre] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [guardando, setGuardando] = React.useState(false)

  // Resetea el formulario al cerrar, para que al reabrir esté en blanco.
  function handleOpenChange(v: boolean) {
    if (!v) {
      setNombre("")
      setError(null)
    }
    onOpenChange(v)
  }

  async function guardar() {
    setError(null)
    setGuardando(true)
    const { error: err } = await crearArea(asambleaId, nombre)
    setGuardando(false)
    if (err) {
      setError(err)
      return
    }
    handleOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva área restringida</DialogTitle>
          <DialogDescription>
            Dale un nombre que identifique la zona. Luego podrás generar enlaces
            de acceso para ella.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="nombre-area">Nombre del área</Label>
          <Input
            id="nombre-area"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Palco A, Departamentos, Zona restringida…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !guardando) guardar()
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Creando…" : "Crear área"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EliminarAreaDialog({
  open,
  onOpenChange,
  area,
  tienePases,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  area: Area
  tienePases: boolean
}) {
  const router = useRouter()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar «{area.nombre}»</AlertDialogTitle>
          <AlertDialogDescription>
            {tienePases
              ? "Se eliminará el área y todos sus enlaces dejarán de funcionar. Esta acción no se puede deshacer."
              : "Se eliminará el área. Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await eliminarArea(area.id)
              router.refresh()
            }}
          >
            Eliminar área
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
