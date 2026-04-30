"use server"

import { createAdminClient } from "@/lib/supabase/admin"

function normalizePhone(s: string): string {
  return s.replace(/\D/g, "")
}

export async function completarRegistroCapitan(input: {
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
    .select("token, capitan_id, target_role, expires_at, asamblea_id")
    .eq("token", input.token)
    .maybeSingle()
  if (enlaceErr || !enlace) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }
  if (enlace.target_role !== "capitan_reset") {
    return { ok: false, error: "Este enlace no es válido." }
  }
  if (new Date(enlace.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }

  const { data: capitan, error: capErr } = await admin
    .from("capitanes")
    .select("id, user_id, telefono")
    .eq("id", enlace.capitan_id)
    .single()
  if (capErr || !capitan) {
    return { ok: false, error: "Capitán no encontrado." }
  }
  if (capitan.user_id) {
    return {
      ok: false,
      error:
        "Este capitán ya tiene cuenta. Usa la opción de restablecer contraseña.",
    }
  }

  let email: string
  const isEmail = identificador.includes("@")
  if (isEmail) {
    email = identificador.toLowerCase()
  } else {
    const enteredDigits = normalizePhone(identificador)
    const storedDigits = normalizePhone(capitan.telefono as string)
    if (!enteredDigits) {
      return { ok: false, error: "Teléfono inválido." }
    }
    if (enteredDigits !== storedDigits) {
      return {
        ok: false,
        error: "El teléfono no coincide con el registrado para este capitán.",
      }
    }
    // Synthesize a unique email for phone-based auth
    email = `cap-${enteredDigits}@phone.acms.local`
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
    .from("capitanes")
    .update({ user_id: userId })
    .eq("id", capitan.id)
  if (updateErr) {
    // Roll back the auth user so we don't leave an orphan account.
    await admin.auth.admin.deleteUser(userId)
    return { ok: false, error: updateErr.message }
  }

  const { error: miembroErr } = await admin
    .from("asamblea_miembros")
    .insert({
      asamblea_id: enlace.asamblea_id,
      user_id: userId,
      role: "capitan",
    })
  if (miembroErr && miembroErr.code !== "23505") {
    return { ok: false, error: miembroErr.message }
  }

  await admin.from("enlaces_registro").delete().eq("token", input.token)

  return { ok: true, error: null }
}

export async function restablecerCapitanPassword(input: {
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
    .select("token, capitan_id, target_role, expires_at")
    .eq("token", input.token)
    .maybeSingle()
  if (enlaceErr || !enlace) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }
  if (enlace.target_role !== "capitan_reset") {
    return { ok: false, error: "Este enlace no es para restablecer contraseña." }
  }
  if (new Date(enlace.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "Este enlace ya no es válido o expiró." }
  }

  const { data: capitan, error: capErr } = await admin
    .from("capitanes")
    .select("id, telefono, user_id")
    .eq("id", enlace.capitan_id)
    .single()
  if (capErr || !capitan) {
    return { ok: false, error: "Capitán no encontrado." }
  }
  if (!capitan.user_id) {
    return {
      ok: false,
      error:
        "Este capitán todavía no tiene cuenta. Pídele que se registre con el enlace de invitación.",
    }
  }

  const ident = input.identificador.trim().toLowerCase()
  const isEmail = ident.includes("@")
  if (isEmail) {
    const { data: userRes, error: userErr } =
      await admin.auth.admin.getUserById(capitan.user_id as string)
    if (userErr || !userRes.user) {
      return { ok: false, error: "No se pudo verificar la cuenta." }
    }
    if ((userRes.user.email ?? "").toLowerCase() !== ident) {
      return { ok: false, error: "El correo no coincide con este capitán." }
    }
  } else {
    const enteredDigits = normalizePhone(ident)
    const storedDigits = normalizePhone(capitan.telefono as string)
    if (!enteredDigits || enteredDigits !== storedDigits) {
      return { ok: false, error: "El teléfono no coincide con este capitán." }
    }
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    capitan.user_id as string,
    { password: input.nuevaPassword },
  )
  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  await admin.from("enlaces_registro").delete().eq("token", input.token)

  return { ok: true, error: null }
}
