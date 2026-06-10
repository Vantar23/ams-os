import Link from "next/link"
import { cookies } from "next/headers"
import { AlertTriangleIcon, MapPinIcon } from "lucide-react"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { CapitanCard } from "@/components/capitan-card"
import { RememberPersonal } from "@/components/remember-personal"
import {
  momentoEnRecinto,
  slotLabelCorto,
  slotsVisibles,
} from "@/lib/disponibilidad"

import { ClaimView } from "./claim-view"
import { RebindButton } from "./rebind-button"

const DEVICE_COOKIE = "hermana_apoyo_device_key"

type Puesto = {
  asignacion_id: string
  slot: string
  area_id: string
  area_piso: string
  area_nombre: string
  area_filas: number
  area_capacidad: number
}

type Hermana = {
  id: string
  asamblea_id: string
  nombre: string
  apellido: string
  congregacion: string
  telefono: string
  notas: string | null
  asamblea_numero: string
  asamblea_edicion: string
  asamblea_titulo: string
  asamblea_fechas: string
  asamblea_sede: string
  is_unbound: boolean
  disponibilidad: string[]
  asistencia_self_confirmada: string[]
  asistencia_confirmada: string[]
}

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value

  if (!deviceKey) {
    return <BlockedView reason="no_cookie" accessToken={access_token} />
  }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("hermana_acceso_open", {
    p_access_token: access_token,
    p_device_key_hash: deviceKeyHash,
  })

  if (error) {
    if (error.message.includes("device_mismatch")) {
      return <BlockedView reason="device_mismatch" accessToken={access_token} />
    }
    if (error.message.includes("invalid_access_token")) {
      return <BlockedView reason="invalid" accessToken={access_token} />
    }
    return (
      <BlockedView
        reason="error"
        message={error.message}
        accessToken={access_token}
      />
    )
  }

  const hermana = (data ?? [])[0] as Hermana | undefined
  if (!hermana) {
    return <BlockedView reason="invalid" />
  }

  if (hermana.is_unbound) {
    return (
      <ClaimView
        accessToken={access_token}
        nombre={hermana.nombre}
        asamblea={{
          numero: hermana.asamblea_numero,
          edicion: hermana.asamblea_edicion,
          titulo: hermana.asamblea_titulo,
        }}
      />
    )
  }

  const { data: asignaciones } = await supabase.rpc(
    "hermana_get_asignaciones",
    {
      p_access_token: access_token,
      p_device_key_hash: deviceKeyHash,
    },
  )
  const todas = (asignaciones ?? []) as Puesto[]
  const visibles = slotsVisibles(
    todas.map((p) => p.slot),
    momentoEnRecinto(),
  )
  const puestos = todas.filter((p) => visibles.includes(p.slot))
  const capitan = await loadCapitanAsignado(hermana.id)

  return <HermanaView hermana={hermana} puestos={puestos} capitan={capitan} />
}

async function loadCapitanAsignado(hermanaId: string) {
  const admin = createAdminClient()
  const { data: fila } = await admin
    .from("hermanas_apoyo")
    .select("capitan_id")
    .eq("id", hermanaId)
    .maybeSingle()
  if (!fila?.capitan_id) return null
  const { data: capitan } = await admin
    .from("capitanes")
    .select("nombre, apellido, telefono")
    .eq("id", fila.capitan_id)
    .maybeSingle()
  return capitan as {
    nombre: string
    apellido: string
    telefono: string | null
  } | null
}

type CapitanAsignado = {
  nombre: string
  apellido: string
  telefono: string | null
}

function HermanaView({
  hermana,
  puestos,
  capitan,
}: {
  hermana: Hermana
  puestos: Puesto[]
  capitan: CapitanAsignado | null
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <RememberPersonal
        tipo="hermana"
        id={hermana.id}
        asambleaId={hermana.asamblea_id}
        nombre={hermana.nombre}
        apellido={hermana.apellido}
      />
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
        Asamblea N° {hermana.asamblea_numero} —{" "}
        {hermana.asamblea_edicion}
      </p>
      <h1 className="mt-3 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Hola, {hermana.nombre} {hermana.apellido}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
          Estás asignada como hermana de apoyo
        </p>
        {puestos.map((p) => (
          <span
            key={p.asignacion_id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground"
          >
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            {p.area_nombre} · {slotLabelCorto(p.slot)}
          </span>
        ))}
      </div>

      {capitan && (
        <CapitanCard
          nombre={capitan.nombre}
          apellido={capitan.apellido}
          telefono={capitan.telefono}
        />
      )}

      <p className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Si pierdes este enlace, escríbele a tu capitán para que te genere uno
        nuevo.
      </p>
    </main>
  )
}

function BlockedView({
  reason,
  message,
  accessToken,
}: {
  reason: "device_mismatch" | "invalid" | "no_cookie" | "error"
  message?: string
  accessToken?: string
}) {
  const titles: Record<typeof reason, string> = {
    device_mismatch: "Este enlace ya está activo en otro dispositivo",
    invalid: "Enlace no válido",
    no_cookie: "No pudimos identificar tu dispositivo",
    error: "Algo salió mal",
  }
  const descriptions: Record<typeof reason, string> = {
    device_mismatch:
      "Tu enlace personal ya está activo en otro dispositivo. Si es tuyo, puedes cerrar esa sesión y activarlo aquí.",
    invalid:
      "Este enlace no existe o fue invalidado. Pídele a tu capitán que te envíe uno nuevo.",
    no_cookie:
      "Tu navegador bloqueó el cookie que necesitamos para identificarte. Activa cookies para este sitio y vuelve a intentar.",
    error: message ?? "Intenta de nuevo en un momento.",
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AlertTriangleIcon className="size-6" />
        </div>
        <h1 className="mt-6 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
          {titles[reason]}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {descriptions[reason]}
        </p>
        {reason === "device_mismatch" && accessToken && (
          <RebindButton accessToken={accessToken} />
        )}
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-foreground underline underline-offset-4"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
