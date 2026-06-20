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
  UsersIcon,
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
import { AutorizacionTercero } from "@/components/aviso-aceptacion"
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
  buscarPersonal,
  crearArea,
  eliminarArea,
  eliminarPase,
  generarPase,
  type PersonaEncontrada,
} from "./actions"

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
  cupo: number
  usados: number
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

// Describe para cuántas personas/dispositivos sirve el enlace.
function frasePersonas(cupo: number): string {
  return cupo <= 1
    ? "Funciona para 1 persona (1 dispositivo)"
    : `Funciona para ${cupo} personas (hasta ${cupo} dispositivos)`
}

// Abre WhatsApp con el enlace listo para enviar. Sin número: deja que el admin
// elija el contacto al que se lo manda. Si hay teléfono, va directo a esa persona.
function whatsappShareUrl(
  areaNombre: string,
  url: string,
  nombre: string | null,
  telefono: string | null,
  cupo: number,
): string {
  const saludo = nombre ? `Hola ${nombre}` : "Hola"
  const personas =
    cupo <= 1
      ? "Sirve para 1 persona: se activa en el primer dispositivo donde lo abras."
      : `Sirve para ${cupo} personas: ábrelo en cada dispositivo (hasta ${cupo}). Al completarse ya no admitirá más.`
  const text = `${saludo}, este es tu enlace de acceso a ${areaNombre}. ${personas} ${url}`
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
          de acceso controlado). Cada enlace admite la cantidad de accesos
          (dispositivos) que elijas; al llenarse no admite más y no se reutiliza.
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
  const [variosOpen, setVariosOpen] = React.useState(false)
  const [borrarArea, setBorrarArea] = React.useState(false)

  const usados = pases.reduce((s, p) => s + p.usados, 0)
  const cupoTotal = pases.reduce((s, p) => s + p.cupo, 0)

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg leading-tight">
            {area.nombre}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pases.length} enlace{pases.length === 1 ? "" : "s"} ·{" "}
            {usados}/{cupoTotal} accesos en uso
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={() => setShareOpen(true)}>
            <LinkIcon className="size-4" />
            Compartir enlace
          </Button>
          <Button size="sm" variant="outline" onClick={() => setVariosOpen(true)}>
            <UsersIcon className="size-4" />
            Varios
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

      <EnviarVariosDialog
        open={variosOpen}
        onOpenChange={setVariosOpen}
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
  const [cupo, setCupo] = React.useState(1)
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [autorizado, setAutorizado] = React.useState(false)

  // Buscador de personal ya registrado.
  const [search, setSearch] = React.useState("")
  const [resultados, setResultados] = React.useState<PersonaEncontrada[]>([])
  const [buscando, setBuscando] = React.useState(false)
  const [abierto, setAbierto] = React.useState(false)

  const url = token ? paseUrl(token) : ""

  // Cada vez que se abre el diálogo arranca limpio: el enlace anterior ya no se
  // re-muestra (cada enlace es de un solo uso/dispositivo).
  function handleOpenChange(v: boolean) {
    if (!v) {
      setToken(null)
      setNombre("")
      setTelefono("")
      setCupo(1)
      setError(null)
      setCopied(false)
      setSearch("")
      setResultados([])
      setAbierto(false)
      setAutorizado(false)
    }
    onOpenChange(v)
  }

  // Búsqueda con debounce. Todo el setState ocurre dentro del timeout (async),
  // no en el cuerpo del efecto, para no disparar renders en cascada.
  React.useEffect(() => {
    const q = search.trim()
    if (q.length < 2) return
    let cancelado = false
    const t = setTimeout(async () => {
      setBuscando(true)
      const r = await buscarPersonal(asambleaId, q)
      if (cancelado) return
      setResultados(r)
      setBuscando(false)
      setAbierto(true)
    }, 250)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [search, asambleaId])

  function onSearchChange(v: string) {
    setSearch(v)
    if (v.trim().length < 2) {
      setResultados([])
      setAbierto(false)
    }
  }

  function elegirPersona(p: PersonaEncontrada) {
    setNombre(p.nombre)
    setTelefono(p.telefono ?? "")
    setSearch("")
    setResultados([])
    setAbierto(false)
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
      cupo,
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
            Genera un enlace y envíalo. Elige para cuántas personas (dispositivos)
            sirve: cada quien lo abre en su dispositivo hasta llenar el cupo.
            Al completarse no admite más y no se reutiliza.
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`buscar-${area.id}`}>
                Buscar persona registrada
              </Label>
              <div className="relative">
                <Input
                  id={`buscar-${area.id}`}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => {
                    if (resultados.length > 0) setAbierto(true)
                  }}
                  onBlur={() => setTimeout(() => setAbierto(false), 150)}
                  placeholder="Nombre o teléfono…"
                  autoComplete="off"
                />
                {abierto && search.trim().length >= 2 && (
                  <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                    {buscando && (
                      <li className="px-2 py-2 text-sm text-muted-foreground">
                        Buscando…
                      </li>
                    )}
                    {!buscando && resultados.length === 0 && (
                      <li className="px-2 py-2 text-sm text-muted-foreground">
                        Sin resultados
                      </li>
                    )}
                    {resultados.map((p, i) => (
                      <li key={`${p.nombre}-${i}`}>
                        <button
                          type="button"
                          onClick={() => elegirPersona(p)}
                          className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {p.nombre}
                            </span>
                            {p.telefono && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {p.telefono}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {p.tipo}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sup/Aux, capitanes, acomodadores y hermanas. O escribe los datos
                a mano abajo.
              </p>
            </div>
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
            <div className="grid gap-2">
              <Label htmlFor={`cupo-${area.id}`}>
                Cantidad de accesos (dispositivos)
              </Label>
              <Input
                id={`cupo-${area.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={cupo}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setCupo(Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : 1)
                }}
              />
              <p className="text-xs text-muted-foreground">
                {frasePersonas(cupo)}. Útil para enviar un mismo enlace a varios
                familiares o invitados.
              </p>
            </div>
            {(nombre.trim() || telefono.trim()) && (
              <AutorizacionTercero
                checked={autorizado}
                onCheckedChange={setAutorizado}
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              onClick={generar}
              disabled={
                creating ||
                (Boolean(nombre.trim() || telefono.trim()) && !autorizado)
              }
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
                  cupo,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircleIcon />
                Enviar por WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              {frasePersonas(cupo)}. Compártelo con quienes lo usarán; al llenar
              el cupo dejará de admitir dispositivos nuevos.
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

function personaKey(p: PersonaEncontrada): string {
  return `${p.nombre}|${p.telefono ?? ""}`
}

function EnviarVariosDialog({
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
  const [search, setSearch] = React.useState("")
  const [resultados, setResultados] = React.useState<PersonaEncontrada[]>([])
  const [buscando, setBuscando] = React.useState(false)
  const [abierto, setAbierto] = React.useState(false)
  const [seleccionados, setSeleccionados] = React.useState<PersonaEncontrada[]>(
    [],
  )
  const [generando, setGenerando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [enlaces, setEnlaces] = React.useState<
    { persona: PersonaEncontrada; url: string }[] | null
  >(null)

  function handleOpenChange(v: boolean) {
    if (!v) {
      setSearch("")
      setResultados([])
      setAbierto(false)
      setSeleccionados([])
      setGenerando(false)
      setError(null)
      setEnlaces(null)
    }
    onOpenChange(v)
  }

  React.useEffect(() => {
    const q = search.trim()
    if (q.length < 2) return
    let cancelado = false
    const t = setTimeout(async () => {
      setBuscando(true)
      const r = await buscarPersonal(asambleaId, q)
      if (cancelado) return
      setResultados(r)
      setBuscando(false)
      setAbierto(true)
    }, 250)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [search, asambleaId])

  function onSearchChange(v: string) {
    setSearch(v)
    if (v.trim().length < 2) {
      setResultados([])
      setAbierto(false)
    }
  }

  function agregar(p: PersonaEncontrada) {
    setSeleccionados((prev) =>
      prev.some((x) => personaKey(x) === personaKey(p)) ? prev : [...prev, p],
    )
    setSearch("")
    setResultados([])
    setAbierto(false)
  }

  function quitar(p: PersonaEncontrada) {
    setSeleccionados((prev) =>
      prev.filter((x) => personaKey(x) !== personaKey(p)),
    )
  }

  // Genera un pase ÚNICO por cada persona seleccionada (token irrepetible).
  async function generar() {
    if (seleccionados.length === 0) return
    setError(null)
    setGenerando(true)
    const out: { persona: PersonaEncontrada; url: string }[] = []
    for (const p of seleccionados) {
      const { token, error: err } = await generarPase({
        asambleaId,
        areaId: area.id,
        nombre: p.nombre,
        telefono: p.telefono ?? undefined,
      })
      if (!token) {
        setError(err)
        setGenerando(false)
        return
      }
      out.push({ persona: p, url: paseUrl(token) })
    }
    setEnlaces(out)
    setGenerando(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar acceso a varios · {area.nombre}</DialogTitle>
          <DialogDescription>
            Selecciona personas ya registradas. Cada una recibe un enlace único
            ligado a su primer dispositivo.
          </DialogDescription>
        </DialogHeader>

        {!enlaces ? (
          <div className="grid gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => {
                  if (resultados.length > 0) setAbierto(true)
                }}
                onBlur={() => setTimeout(() => setAbierto(false), 150)}
                placeholder="Buscar nombre o teléfono…"
                autoComplete="off"
              />
              {abierto && search.trim().length >= 2 && (
                <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                  {buscando && (
                    <li className="px-2 py-2 text-sm text-muted-foreground">
                      Buscando…
                    </li>
                  )}
                  {!buscando && resultados.length === 0 && (
                    <li className="px-2 py-2 text-sm text-muted-foreground">
                      Sin resultados
                    </li>
                  )}
                  {resultados.map((p, i) => {
                    const ya = seleccionados.some(
                      (x) => personaKey(x) === personaKey(p),
                    )
                    return (
                      <li key={`${p.nombre}-${i}`}>
                        <button
                          type="button"
                          disabled={ya}
                          onClick={() => agregar(p)}
                          className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {p.nombre}
                            </span>
                            {p.telefono && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {p.telefono}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {ya ? "Agregado" : p.tipo}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {seleccionados.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Aún no has seleccionado a nadie.
              </p>
            ) : (
              <ul className="max-h-52 space-y-1.5 overflow-auto">
                {seleccionados.map((p) => (
                  <li
                    key={personaKey(p)}
                    className="flex items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {p.nombre}
                      </span>
                      {p.telefono && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.telefono}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitar(p)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Quitar"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              onClick={generar}
              disabled={generando || seleccionados.length === 0}
              className="w-full"
            >
              {generando
                ? "Generando…"
                : `Generar ${seleccionados.length || ""} enlace${
                    seleccionados.length === 1 ? "" : "s"
                  }`}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {enlaces.length} enlace{enlaces.length === 1 ? "" : "s"} generado
              {enlaces.length === 1 ? "" : "s"}
            </p>
            <ul className="max-h-72 space-y-2 overflow-auto">
              {enlaces.map(({ persona, url }) => (
                <EnlaceVariosRow
                  key={personaKey(persona)}
                  persona={persona}
                  url={url}
                  areaNombre={area.nombre}
                />
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {enlaces ? (
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setEnlaces(null)
                setSeleccionados([])
              }}
              className="px-0 text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              Enviar a otros
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

function EnlaceVariosRow({
  persona,
  url,
  areaNombre,
}: {
  persona: PersonaEncontrada
  url: string
  areaNombre: string
}) {
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
    <li className="flex items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {persona.nombre}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {persona.telefono || "Sin teléfono"}
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={copy}
          aria-label={copied ? "Copiado" : "Copiar enlace"}
          className="text-muted-foreground"
        >
          {copied ? (
            <CheckIcon className="size-4 text-primary" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </Button>
        <Button type="button" size="icon" asChild>
          <a
            href={whatsappShareUrl(
              areaNombre,
              url,
              persona.nombre,
              persona.telefono,
              1,
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Enviar por WhatsApp"
          >
            <MessageCircleIcon className="size-4" />
          </a>
        </Button>
      </div>
    </li>
  )
}

function PaseRow({ pase }: { pase: Pase }) {
  const router = useRouter()
  const [borrar, setBorrar] = React.useState(false)
  const [copiado, setCopiado] = React.useState(false)
  const lleno = pase.usados >= pase.cupo
  const enUso = pase.usados > 0
  // Un enlace de varios dispositivos no es de una persona en concreto.
  const esVarios = pase.cupo > 1

  // Estado legible del pase según cuántos lugares se han ocupado.
  const estado = lleno
    ? "Completo"
    : enUso
      ? `${pase.usados}/${pase.cupo} en uso`
      : esVarios
        ? `Sin abrir · ${pase.cupo} accesos`
        : "Sin abrir"

  // Título: un enlace personal (1 dispositivo) lleva el nombre de quien lo usará.
  // Un enlace de varios no corresponde a una sola persona, así que lleva un
  // título genérico que deja claro que sirve para varios dispositivos; si se le
  // puso un nombre (p. ej. «Familia García») se respeta.
  const titulo = esVarios
    ? pase.nombre || `Enlace para varios (${pase.cupo} accesos)`
    : pase.nombre || estado

  // Detalle secundario: muestra el estado salvo cuando ya es el propio título.
  const detalle = [
    titulo === estado ? null : estado,
    pase.telefono,
    `creado ${fechaCorta(pase.created_at)}`,
  ]
    .filter(Boolean)
    .join(" · ")

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
            (enUso
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground")
          }
        >
          {esVarios ? (
            <UsersIcon className="size-4" />
          ) : (
            <SmartphoneIcon className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{titulo}</p>
          <p className="truncate text-xs text-muted-foreground">{detalle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!lleno && (
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
              {enUso
                ? `${pase.usados === 1 ? "El dispositivo" : `Los ${pase.usados} dispositivos`} que lo ${pase.usados === 1 ? "usa" : "usan"} dejará${pase.usados === 1 ? "" : "n"} de tener acceso de inmediato. Esta acción no se puede deshacer.`
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
