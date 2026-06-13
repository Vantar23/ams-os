import { AvisosOverlay } from "@/components/avisos-overlay"

import { loadCapitanActual } from "./load"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  // Solo un capitán con ficha recibe avisos aquí; un owner que entre a /capitan
  // no tiene cola que mostrar.
  const actual = await loadCapitanActual()
  return (
    <>
      {children}
      {actual && <AvisosOverlay origen="capitan" asambleaId={actual.asamblea.id} />}
    </>
  )
}
