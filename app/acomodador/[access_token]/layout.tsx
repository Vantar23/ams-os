import { AvisosOverlay } from "@/components/avisos-overlay"
import { PortalNotificaciones } from "@/components/portal-notificaciones"

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  return (
    <>
      {children}
      <PortalNotificaciones tipo="acomodador" accessToken={access_token} />
      <AvisosOverlay origen="personal" tipo="acomodador" accessToken={access_token} />
    </>
  )
}
