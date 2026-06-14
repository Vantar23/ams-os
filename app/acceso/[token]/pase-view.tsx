import { MousePointerClickIcon } from "lucide-react"

import { PaseCard } from "./pase-card"
import type { Pase } from "./load"

export function PaseView({ pase }: { pase: Pase }) {
  return (
    <main className="relative flex min-h-svh flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Asamblea N° {pase.asamblea_numero} — {pase.asamblea_edicion}
        </p>
        <h1 className="mt-2 font-serif text-2xl leading-tight text-foreground sm:text-3xl">
          {pase.area_nombre}
        </h1>
      </div>

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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 px-6 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <MousePointerClickIcon className="size-3.5" />
          Arrastra tu pase
        </span>
        <p className="text-xs text-muted-foreground">
          Este pase solo funciona en este dispositivo.
        </p>
      </div>
    </main>
  )
}
