"use server"

import { guardarSuscripcion } from "@/lib/push/server"
import { createClient } from "@/lib/supabase/server"

export async function suscribirPushAdmin(sub: {
  endpoint: string
  p256dh: string
  auth: string
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return { ok: false, error: "Sin asamblea" }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!miembro) return { ok: false, error: "Sin acceso" }

  return guardarSuscripcion({
    asambleaId,
    destinatario: "admin",
    userId: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  })
}
