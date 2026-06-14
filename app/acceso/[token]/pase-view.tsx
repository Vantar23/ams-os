import { PaseCard } from "./pase-card"
import type { Pase } from "./load"

export function PaseView({ pase }: { pase: Pase }) {
  return (
    <main className="h-svh w-full overflow-hidden bg-background">
      <PaseCard
        data={{
          area_nombre: pase.area_nombre,
          nombre: pase.nombre,
          asamblea_numero: pase.asamblea_numero,
          asamblea_edicion: pase.asamblea_edicion,
          asamblea_titulo: pase.asamblea_titulo,
          asamblea_sede: pase.asamblea_sede,
          asamblea_fechas: pase.asamblea_fechas,
        }}
      />
    </main>
  )
}
