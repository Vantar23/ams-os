"use server"

import { createAdminClient } from "@/lib/supabase/admin"

function normalizePhone(s: string): string {
  return s.replace(/\D/g, "")
}

export async function completarRegistroSubAux(input: {
  token: string
  identificador: string
  password: string
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    return await runCompletarRegistroSubAux(input)
  } catch (e) {
    console.error("completarRegistroSubAux failed", e)
    const message =
      e instanceof Error ? e.message : "Error desconocido al activar la cuenta."
    return { ok: false, error: message }
  }
}

async function runCompletarRegistroSubAux(input: {
  token: string
  identificador: string
  password: string
}): Promise<{ ok: boolean; error: string | null }> {
  const identificador = input.identificador.trim()
  if (!identificador) {
    return { ok: false, error: "Ingresa tu correo o teléfono." }
  }
  if (input.password.length < 8) {
    return { ok: false, error: "La contraseña debe tener mínimo 8 caracteres." }
  }

  const admin = createAdminClient()

  const { data: enlace, error: enlaceErr } = await admin
    .from("enlaces_registro")
    .select("token, sub_aux_id, target_role, expires_at, asamblea_id")
    .eq("token", input.token)
    .maybeSingle()
  if (enlaceErr || !enlace) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }
  if (enlace.target_role !== "sub_aux_reset") {
    return { ok: false, error: "Este enlace no es válido." }
  }
  if (new Date(enlace.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }

  const { data: persona, error: personaErr } = await admin
    .from("sub_aux")
    .select("id, user_id, telefono, role")
    .eq("id", enlace.sub_aux_id)
    .single()
  if (personaErr || !persona) {
    return { ok: false, error: "Registro no encontrado." }
  }
  if (persona.user_id) {
    return {
      ok: false,
      error: "Esta cuenta ya está activa. Usa la opción de restablecer contraseña.",
    }
  }

  let email: string
  const isEmail = identificador.includes("@")
  if (isEmail) {
    email = identificador.toLowerCase()
  } else {
    const enteredDigits = normalizePhone(identificador)
    const storedDigits = normalizePhone(persona.telefono as string)
    if (!enteredDigits) {
      return { ok: false, error: "Teléfono inválido." }
    }
    if (enteredDigits !== storedDigits) {
      return {
        ok: false,
        error: "El teléfono no coincide con el registrado.",
      }
    }
    email = `sa-${enteredDigits}@phone.acms.local`
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password: input.password,
      email_confirm: true,
    },
  )
  if (createErr || !created.user) {
    return {
      ok: false,
      error: createErr?.message ?? "No se pudo crear la cuenta.",
    }
  }

  const userId = created.user.id

  const { error: updateErr } = await admin
    .from("sub_aux")
    .update({ user_id: userId })
    .eq("id", persona.id)
  if (updateErr) {
    await admin.auth.admin.deleteUser(userId)
    return { ok: false, error: updateErr.message }
  }

  const { error: miembroErr } = await admin
    .from("asamblea_miembros")
    .insert({
      asamblea_id: enlace.asamblea_id,
      user_id: userId,
      role: persona.role as string,
    })
  if (miembroErr && miembroErr.code !== "23505") {
    return { ok: false, error: miembroErr.message }
  }

  await admin.from("enlaces_registro").delete().eq("token", input.token)

  return { ok: true, error: null }
}

export async function restablecerSubAuxPassword(input: {
  token: string
  identificador: string
  nuevaPassword: string
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    return await runRestablecerSubAuxPassword(input)
  } catch (e) {
    console.error("restablecerSubAuxPassword failed", e)
    const message =
      e instanceof Error
        ? e.message
        : "Error desconocido al restablecer contraseña."
    return { ok: false, error: message }
  }
}

async function runRestablecerSubAuxPassword(input: {
  token: string
  identificador: string
  nuevaPassword: string
}): Promise<{ ok: boolean; error: string | null }> {
  if (input.nuevaPassword.length < 8) {
    return { ok: false, error: "La contraseña debe tener mínimo 8 caracteres." }
  }

  const admin = createAdminClient()

  const { data: enlace, error: enlaceErr } = await admin
    .from("enlaces_registro")
    .select("token, sub_aux_id, target_role, expires_at")
    .eq("token", input.token)
    .maybeSingle()
  if (enlaceErr || !enlace) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }
  if (enlace.target_role !== "sub_aux_reset") {
    return { ok: false, error: "Este enlace no es para restablecer contraseña." }
  }
  if (new Date(enlace.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }

  const { data: persona, error: personaErr } = await admin
    .from("sub_aux")
    .select("id, telefono, user_id")
    .eq("id", enlace.sub_aux_id)
    .single()
  if (personaErr || !persona) {
    return { ok: false, error: "Registro no encontrado." }
  }
  if (!persona.user_id) {
    return {
      ok: false,
      error: "Esta cuenta todavía no está activa. Usa el enlace de invitación.",
    }
  }

  const ident = input.identificador.trim().toLowerCase()
  const isEmail = ident.includes("@")
  if (isEmail) {
    const { data: userRes, error: userErr } =
      await admin.auth.admin.getUserById(persona.user_id as string)
    if (userErr || !userRes.user) {
      return { ok: false, error: "No se pudo verificar la cuenta." }
    }
    if ((userRes.user.email ?? "").toLowerCase() !== ident) {
      return { ok: false, error: "El correo no coincide." }
    }
  } else {
    const enteredDigits = normalizePhone(ident)
    const storedDigits = normalizePhone(persona.telefono as string)
    if (!enteredDigits || enteredDigits !== storedDigits) {
      return { ok: false, error: "El teléfono no coincide." }
    }
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    persona.user_id as string,
    { password: input.nuevaPassword },
  )
  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  await admin.from("enlaces_registro").delete().eq("token", input.token)

  return { ok: true, error: null }
}
