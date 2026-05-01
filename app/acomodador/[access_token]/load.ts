import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"

const DEVICE_COOKIE = "acomodador_device_key"

export type Acomodador = {
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

export type LoadResult =
  | { kind: "blocked"; reason: BlockReason; message?: string }
  | { kind: "claim"; nombre: string; asamblea: { numero: string; edicion: string; titulo: string } }
  | { kind: "ok"; acomodador: Acomodador }

export type BlockReason = "no_cookie" | "device_mismatch" | "invalid" | "error"

export async function loadAcomodadorByToken(
  accessToken: string,
): Promise<LoadResult> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { kind: "blocked", reason: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("acceso_open", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (error) {
    if (error.message.includes("device_mismatch")) {
      return { kind: "blocked", reason: "device_mismatch" }
    }
    if (error.message.includes("invalid_access_token")) {
      return { kind: "blocked", reason: "invalid" }
    }
    return { kind: "blocked", reason: "error", message: error.message }
  }

  const acomodador = (data ?? [])[0] as Acomodador | undefined
  if (!acomodador) return { kind: "blocked", reason: "invalid" }

  if (acomodador.is_unbound) {
    return {
      kind: "claim",
      nombre: acomodador.nombre,
      asamblea: {
        numero: acomodador.asamblea_numero,
        edicion: acomodador.asamblea_edicion,
        titulo: acomodador.asamblea_titulo,
      },
    }
  }

  return { kind: "ok", acomodador }
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
