"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const DEVICE_COOKIE = "hermana_apoyo_device_key"

export async function claimAccess(
  accessToken: string,
): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("hermana_acceso_claim", {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/hermana-apoyo/${accessToken}`)
  return { ok: true, error: null }
}

export async function toggleSelfAsistencia(input: {
  accessToken: string
  slot: string
  confirmar: boolean
}): Promise<{ ok: boolean; error: string | null }> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE)?.value
  if (!deviceKey) return { ok: false, error: "no_cookie" }

  const deviceKeyHash = await sha256(deviceKey)
  const supabase = await createClient()
  const { error } = await supabase.rpc("hermana_acceso_toggle_asistencia", {
    p_access_token: input.accessToken,
    p_device_key_hash: deviceKeyHash,
    p_slot: input.slot,
    p_confirmar: input.confirmar,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/hermana-apoyo/${input.accessToken}`)
  return { ok: true, error: null }
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
