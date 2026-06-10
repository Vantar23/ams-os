"use server"

// Acciones compartidas de los portales personales (acomodadores y hermanas
// de apoyo). Todas validan el enlace personal + dispositivo vinculado antes
// de tocar datos.

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type PersonalTipo = "acomodador" | "hermana"

const DEVICE_COOKIE: Record<PersonalTipo, string> = {
  acomodador: "acomodador_device_key",
  hermana: "hermana_apoyo_device_key",
}

const PORTAL_BASE: Record<PersonalTipo, string> = {
  acomodador: "/acomodador",
  hermana: "/hermana-apoyo",
}

const ACCESO_OPEN_RPC: Record<PersonalTipo, string> = {
  acomodador: "acceso_open",
  hermana: "hermana_acceso_open",
}

export type MensajePersonal = {
  id: string
  remitente: "persona" | "admin"
  cuerpo: string
  created_at: string
}

export async function listarMensajesPersonal(
  tipo: PersonalTipo,
  accessToken: string,
): Promise<{ ok: boolean; error: string | null; mensajes: MensajePersonal[] }> {
  const deviceKeyHash = await deviceHash(tipo)
  if (!deviceKeyHash) return { ok: false, error: "no_cookie", mensajes: [] }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("mensajes_listar_personal", {
    p_tipo: tipo,
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (error) return { ok: false, error: error.message, mensajes: [] }
  return { ok: true, error: null, mensajes: (data ?? []) as MensajePersonal[] }
}

export async function enviarMensajePersonal(
  tipo: PersonalTipo,
  accessToken: string,
  cuerpo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const texto = cuerpo.trim()
  if (!texto) return { ok: false, error: "Escribe un mensaje." }
  if (texto.length > 2000) {
    return { ok: false, error: "El mensaje es demasiado largo." }
  }

  const deviceKeyHash = await deviceHash(tipo)
  if (!deviceKeyHash) return { ok: false, error: "no_cookie" }

  const supabase = await createClient()
  const { error } = await supabase.rpc("mensajes_enviar_personal", {
    p_tipo: tipo,
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
    p_cuerpo: texto,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, error: null }
}

export async function reportarIncidenciaPersonal(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const personalTipo = parseTipo(formData.get("personalTipo"))
  const accessToken = String(formData.get("accessToken") ?? "")
  const tipo = String(formData.get("tipo") ?? "").trim()
  const ubicacion = String(formData.get("ubicacion") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!personalTipo || !accessToken) {
    return { ok: false, error: "Token inválido." }
  }
  if (!tipo) return { ok: false, error: "Selecciona o escribe el tipo." }
  if (!foto || foto.size === 0) {
    return { ok: false, error: "Adjunta una foto de la incidencia." }
  }

  const persona = await openPersona(personalTipo, accessToken)
  if (!persona.ok || !persona.persona) {
    return { ok: false, error: persona.error ?? "Acceso inválido." }
  }

  const admin = createAdminClient()
  const ext = guessExt(foto.type, foto.name)
  const fotoPath = `${persona.persona.asamblea_id}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage
    .from("incidencias")
    .upload(fotoPath, foto, {
      contentType: foto.type || "image/jpeg",
      upsert: false,
    })
  if (upErr) {
    return { ok: false, error: `No se pudo subir la foto: ${upErr.message}` }
  }

  const { error: insertErr } = await admin.from("incidencias").insert({
    asamblea_id: persona.persona.asamblea_id,
    tipo,
    ubicacion: ubicacion || null,
    descripcion: descripcion || null,
    foto_path: fotoPath,
    reportado_por_acomodador_id:
      personalTipo === "acomodador" ? persona.persona.id : null,
    reportado_por_hermana_id:
      personalTipo === "hermana" ? persona.persona.id : null,
  })
  if (insertErr) {
    await admin.storage.from("incidencias").remove([fotoPath])
    return { ok: false, error: insertErr.message }
  }

  revalidatePath(`${PORTAL_BASE[personalTipo]}/${accessToken}/incidencias`)
  return { ok: true, error: null }
}

export async function reportarRecepcionPersonal(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const personalTipo = parseTipo(formData.get("personalTipo"))
  const accessToken = String(formData.get("accessToken") ?? "")
  const desperfecto = String(formData.get("desperfecto") ?? "").trim()
  const descripcion = String(formData.get("descripcion") ?? "").trim()
  const nivel = String(formData.get("nivel") ?? "").trim()
  const zona = String(formData.get("zona") ?? "").trim()
  const butaca = String(formData.get("butaca") ?? "").trim()
  const otroObjeto = String(formData.get("otro_objeto") ?? "").trim()
  const foto = formData.get("foto") as File | null

  if (!personalTipo || !accessToken) {
    return { ok: false, error: "Token inválido." }
  }
  if (!desperfecto) {
    return { ok: false, error: "Selecciona o escribe el desperfecto." }
  }
  if (!foto || foto.size === 0) {
    return { ok: false, error: "Adjunta una foto del problema." }
  }

  const persona = await openPersona(personalTipo, accessToken)
  if (!persona.ok || !persona.persona) {
    return { ok: false, error: persona.error ?? "Acceso inválido." }
  }

  const admin = createAdminClient()
  const ext = guessExt(foto.type, foto.name)
  const fotoPath = `${persona.persona.asamblea_id}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage
    .from("recepcion-local")
    .upload(fotoPath, foto, {
      contentType: foto.type || "image/jpeg",
      upsert: false,
    })
  if (upErr) {
    return { ok: false, error: `No se pudo subir la foto: ${upErr.message}` }
  }

  const { error: insertErr } = await admin
    .from("recepcion_local_items")
    .insert({
      asamblea_id: persona.persona.asamblea_id,
      desperfecto,
      descripcion: descripcion || null,
      nivel: nivel || null,
      zona: zona || null,
      butaca: butaca || null,
      otro_objeto: otroObjeto || null,
      foto_path: fotoPath,
      reportado_por_acomodador_id:
        personalTipo === "acomodador" ? persona.persona.id : null,
      reportado_por_hermana_id:
        personalTipo === "hermana" ? persona.persona.id : null,
    })
  if (insertErr) {
    await admin.storage.from("recepcion-local").remove([fotoPath])
    return { ok: false, error: insertErr.message }
  }

  revalidatePath(`${PORTAL_BASE[personalTipo]}/${accessToken}/recepcion-local`)
  return { ok: true, error: null }
}

function parseTipo(value: FormDataEntryValue | null): PersonalTipo | null {
  return value === "acomodador" || value === "hermana" ? value : null
}

async function deviceHash(tipo: PersonalTipo): Promise<string | null> {
  const cookieStore = await cookies()
  const deviceKey = cookieStore.get(DEVICE_COOKIE[tipo])?.value
  if (!deviceKey) return null
  return sha256(deviceKey)
}

async function openPersona(
  tipo: PersonalTipo,
  accessToken: string,
): Promise<{
  ok: boolean
  error: string | null
  persona: { id: string; asamblea_id: string } | null
}> {
  const deviceKeyHash = await deviceHash(tipo)
  if (!deviceKeyHash) return { ok: false, error: "no_cookie", persona: null }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc(ACCESO_OPEN_RPC[tipo], {
    p_access_token: accessToken,
    p_device_key_hash: deviceKeyHash,
  })
  if (error) return { ok: false, error: error.message, persona: null }
  const persona = (data ?? [])[0] as
    | { id: string; asamblea_id: string; is_unbound: boolean }
    | undefined
  if (!persona || persona.is_unbound) {
    return { ok: false, error: "Acceso inválido.", persona: null }
  }
  return { ok: true, error: null, persona }
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

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
