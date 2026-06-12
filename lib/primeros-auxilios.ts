import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Número de primeros auxilios de la asamblea. Usa el service role porque los
 * portales personales (acomodador / hermana) no tienen sesión y el RLS de
 * asambleas no los dejaría leerlo.
 */
export async function loadPrimerosAuxilios(
  asambleaId: string,
): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from("asambleas")
      .select("primeros_auxilios_telefono")
      .eq("id", asambleaId)
      .maybeSingle()
    return (data?.primeros_auxilios_telefono as string | null) ?? null
  } catch {
    // Sin service role (p. ej. dev sin la llave) el botón simplemente no
    // aparece; nunca rompe la página de incidencias.
    return null
  }
}
