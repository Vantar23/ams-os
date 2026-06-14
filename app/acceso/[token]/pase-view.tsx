import { BadgeCheckIcon, CalendarIcon, MapPinIcon } from "lucide-react"

import type { Pase } from "./load"

export function PaseView({ pase }: { pase: Pase }) {
  const holder = pase.nombre?.trim()
  const titulo = holder || pase.area_nombre

  return (
    <main className="flex min-h-svh flex-col bg-card">
      {/* Encabezado sage */}
      <header className="bg-primary px-6 pb-10 pt-12 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-[0.28em]">
          Pase de acceso
        </p>
        <p className="mt-2 text-sm text-primary-foreground/90">
          Asamblea N° {pase.asamblea_numero} — {pase.asamblea_edicion}
        </p>
      </header>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BadgeCheckIcon className="size-9" strokeWidth={2} />
        </div>

        <h1 className="mt-6 font-serif text-4xl leading-[1.1] text-foreground sm:text-5xl">
          {titulo}
        </h1>
        {holder && (
          <p className="mt-2 text-base text-muted-foreground">
            Acceso a {pase.area_nombre}
          </p>
        )}

        <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <span className="size-2 rounded-full bg-primary" />
          Acceso autorizado
        </span>

        <dl className="mt-8 space-y-5">
          {pase.asamblea_sede && (
            <div className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Sede
                </dt>
                <dd className="mt-0.5 text-lg text-foreground">
                  {pase.asamblea_sede}
                </dd>
              </div>
            </div>
          )}
          {pase.asamblea_fechas && (
            <div className="flex items-start gap-3">
              <CalendarIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Fechas
                </dt>
                <dd className="mt-0.5 text-lg text-foreground">
                  {pase.asamblea_fechas}
                </dd>
              </div>
            </div>
          )}
        </dl>

        <div className="mt-auto border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            Ligado a este dispositivo · solo funciona aquí.
          </p>
        </div>
      </div>
    </main>
  )
}
