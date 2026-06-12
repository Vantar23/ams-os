import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { IncidenciaFormBase } from "@/app/acomodador/[access_token]/incidencias/incidencia-form"
import { reportarIncidenciaCapitan } from "@/lib/actions/portal-capitan"

import { loadCapitanActual } from "../load"

export default async function Page() {
  const actual = await loadCapitanActual()
  if (!actual) redirect("/acomodadores")

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <Link
        href="/capitan"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Incidencias
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Reporta una incidencia durante la asamblea. Adjunta una foto y el
        equipo de administración la verá de inmediato.
      </p>

      <IncidenciaFormBase enviar={reportarIncidenciaCapitan} />
    </main>
  )
}
