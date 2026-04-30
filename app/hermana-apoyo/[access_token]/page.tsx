import Link from "next/link"
import { cookies } from "next/headers"
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import type { DisponibilidadSlot } from "@/lib/disponibilidad"
import { RememberPersonal } from "@/components/remember-personal"

import { AsistenciaSection } from "./asistencia-section"
import { ClaimView } from "./claim-view"

const DEVICE_COOKIE = "hermana_apoyo_device_key"

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
    return <BlockedView reason="no_cookie" />
  }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("hermana_acceso_open", {
    p_access_token: access_token,
    p_device_key_hash: deviceKeyHash,
  })

  if (error) {
    if (error.message.includes("device_mismatch")) {
      return <BlockedView reason="device_mismatch" />
    }
    if (error.message.includes("invalid_access_token")) {
      return <BlockedView reason="invalid" />
    }
    return <BlockedView reason="error" message={error.message} />
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

  return (
    <HermanaView hermana={hermana} accessToken={access_token} />
  )
}

function HermanaView({
  hermana,
  accessToken,
}: {
  hermana: Hermana
  accessToken: string
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
        Hola, {hermana.nombre}
      </h1>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        <CheckCircle2Icon className="size-3.5 text-foreground" />
        Acceso activo en este dispositivo
      </p>

      <section className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
        <Field label="Tema" value={hermana.asamblea_titulo} />
        <Field label="Fechas" value={hermana.asamblea_fechas} />
        <Field label="Sede" value={hermana.asamblea_sede} />
        <Field label="Congregación" value={hermana.congregacion} />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Confirmación de asistencia
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Marca las sesiones a las que vas a asistir. Tu capitán las verá
          confirmadas.
        </p>
        <AsistenciaSection
          accessToken={accessToken}
          disponibilidad={hermana.disponibilidad as DisponibilidadSlot[]}
          selfConfirmadas={
            hermana.asistencia_self_confirmada as DisponibilidadSlot[]
          }
        />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Tus datos
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Nombre"
            value={`${hermana.nombre} ${hermana.apellido}`}
          />
          <Field label="Teléfono" value={hermana.telefono} />
          {hermana.notas && (
            <div className="sm:col-span-2">
              <Field label="Notas" value={hermana.notas} />
            </div>
          )}
        </div>
      </section>

      <p className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Si pierdes este enlace, escríbele a tu capitán para que te genere uno
        nuevo.
      </p>
    </main>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm text-foreground">{value}</p>
    </div>
  )
}

function BlockedView({
  reason,
  message,
}: {
  reason: "device_mismatch" | "invalid" | "no_cookie" | "error"
  message?: string
}) {
  const titles: Record<typeof reason, string> = {
    device_mismatch: "Este enlace ya está activo en otro dispositivo",
    invalid: "Enlace no válido",
    no_cookie: "No pudimos identificar tu dispositivo",
    error: "Algo salió mal",
  }
  const descriptions: Record<typeof reason, string> = {
    device_mismatch:
      "Tu enlace personal solo funciona en el primer dispositivo donde lo abriste. Pídele a tu capitán que te genere uno nuevo si necesitas pasarlo a este dispositivo.",
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
