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
  cupo: number
  usados: number
  is_bound: boolean
  is_full: boolean
  created_at: string
}

export type BlockReason = "no_cookie" | "full" | "invalid" | "error"

export type LoadResult =
  | { kind: "blocked"; reason: BlockReason; message?: string }
  | {
      kind: "claim"
      areaNombre: string
      asamblea: AsambleaInfo
      cupo: number
      restantes: number
    }
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
    if (error.message.includes("invalid_access_token")) {
      return { kind: "blocked", reason: "invalid" }
    }
    return { kind: "blocked", reason: "error", message: error.message }
  }

  const pase = (data ?? [])[0] as Pase | undefined
  if (!pase) return { kind: "blocked", reason: "invalid" }

  // Ya tiene lugar en este dispositivo: muestra el pase.
  if (pase.is_bound) return { kind: "ok", pase }

  // Sin lugar y el cupo está lleno: bloqueado.
  if (pase.is_full) return { kind: "blocked", reason: "full" }

  // Quedan lugares: ofrece confirmar este dispositivo.
  return {
    kind: "claim",
    areaNombre: pase.area_nombre,
    cupo: pase.cupo,
    restantes: Math.max(0, pase.cupo - pase.usados),
    asamblea: {
      numero: pase.asamblea_numero,
      edicion: pase.asamblea_edicion,
      titulo: pase.asamblea_titulo,
      fechas: pase.asamblea_fechas,
      sede: pase.asamblea_sede,
    },
  }
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
