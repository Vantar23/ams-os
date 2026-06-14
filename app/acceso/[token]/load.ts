import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"

const DEVICE_COOKIE = "acceso_device_key"

export type Pase = {
  id: string
  area_nombre: string
  nombre: string | null
  asamblea_numero: string
  asamblea_edicion: string
  asamblea_titulo: string
  asamblea_fechas: string
  asamblea_sede: string
  is_unbound: boolean
  created_at: string
  device_bound_at: string | null
}

export type BlockReason = "no_cookie" | "device_mismatch" | "invalid" | "error"

export type LoadResult =
  | { kind: "blocked"; reason: BlockReason; message?: string }
  | { kind: "claim"; areaNombre: string; asamblea: AsambleaInfo }
  | { kind: "ok"; pase: Pase }

export type AsambleaInfo = {
  numero: string
  edicion: string
  titulo: string
  fechas: string
  sede: string
}

export async function loadPaseByToken(token: string): Promise<LoadResult> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { kind: "blocked", reason: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("acceso_pase_open", {
    p_access_token: token,
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

  const pase = (data ?? [])[0] as Pase | undefined
  if (!pase) return { kind: "blocked", reason: "invalid" }

  if (pase.is_unbound) {
    return {
      kind: "claim",
      areaNombre: pase.area_nombre,
      asamblea: {
        numero: pase.asamblea_numero,
        edicion: pase.asamblea_edicion,
        titulo: pase.asamblea_titulo,
        fechas: pase.asamblea_fechas,
        sede: pase.asamblea_sede,
      },
    }
  }

  return { kind: "ok", pase }
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
