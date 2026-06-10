import { createClient } from "./client"

/**
 * Cliente de navegador con el JWT del usuario aplicado al socket de
 * Realtime. Sin esto, la suscripción sale con la llave anónima y las tablas
 * con RLS (mensajes, incidencias) no entregan ningún evento.
 */
export async function createRealtimeClient() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) supabase.realtime.setAuth(session.access_token)
  // Mantén el token del socket al día cuando se refresque la sesión.
  supabase.auth.onAuthStateChange((_event, s) => {
    if (s) supabase.realtime.setAuth(s.access_token)
  })
  return supabase
}
