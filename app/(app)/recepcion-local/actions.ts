"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const BUCKET = "recepcion-local"

async function getOwnerCapitanContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" as const, supabase, user: null }

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return { error: "Sin asamblea" as const, supabase, user }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  const role = miembro?.role as string | undefined
  if (role !== "owner" && role !== "capitan") {
    return { error: "Sin permiso" as const, supabase, user }
  }
  return { error: null, supabase, user, asambleaId }
}

export async function agregarRecepcionItem(formData: FormData): Promise<{
  error: string | null
}> {
  const ctx = await getOwnerCapitanContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, asambleaId } = ctx

  const categoria = String(formData.get("categoria") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!categoria) return { error: "Selecciona o escribe una categoría." }
  if (!foto || foto.size === 0) {
    return { error: "Adjunta una foto del problema." }
  }

  const admin = createAdminClient()
  const ext = guessExt(foto.type, foto.name)
  const fotoPath = `${asambleaId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(fotoPath, foto, {
      contentType: foto.type || "image/jpeg",
      upsert: false,
    })
  if (upErr) return { error: `No se pudo subir la foto: ${upErr.message}` }

  const { error } = await supabase.from("recepcion_local_items").insert({
    asamblea_id: asambleaId,
    categoria,
    descripcion: descripcion || null,
    foto_path: fotoPath,
  })
  if (error) {
    await admin.storage.from(BUCKET).remove([fotoPath])
    return { error: error.message }
  }

  revalidatePath("/recepcion-local")
  return { error: null }
}

export async function actualizarEstadoRecepcion(
  id: string,
  estado: "pendiente" | "en_proceso" | "resuelto",
): Promise<{ error: string | null }> {
  const ctx = await getOwnerCapitanContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase } = ctx
  const { error } = await supabase
    .from("recepcion_local_items")
    .update({ estado })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/recepcion-local")
  return { error: null }
}

export async function eliminarRecepcionItem(
  id: string,
): Promise<{ error: string | null }> {
  const ctx = await getOwnerCapitanContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase } = ctx

  const { data: existing } = await supabase
    .from("recepcion_local_items")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle()

  const { error } = await supabase
    .from("recepcion_local_items")
    .delete()
    .eq("id", id)
  if (error) return { error: error.message }

  if (existing?.foto_path) {
    await createAdminClient().storage.from(BUCKET).remove([existing.foto_path])
  }
  revalidatePath("/recepcion-local")
  return { error: null }
}

function guessExt(mime: string, name: string): string {
  const fromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  }
  if (mime in fromMime) return fromMime[mime]
  const dot = name.lastIndexOf(".")
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase()
  }
  return "jpg"
}
