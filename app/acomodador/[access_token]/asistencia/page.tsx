import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
} from "@/lib/disponibilidad"

import { BlockedView } from "../blocked-view"
import { ClaimView } from "../claim-view"
import { loadAcomodadorByToken, loadAsignaciones } from "../load"

import { LugaresVaciosForm } from "./lugares-vacios-form"

const SLOT_LABEL: Record<string, { dia: string; sesion: string }> =
  Object.fromEntries(
    DISPONIBILIDAD_DIAS.flatMap((d) =>
      DISPONIBILIDAD_SESIONES.map((s) => [
        `${d.key}-${s.key}`,
        { dia: d.label, sesion: s.label },
      ]),
    ),
  )

export default async function Page({
  params,
}: {
  params: Promise<{ access_token: string }>
}) {
  const { access_token } = await params
  const result = await loadAcomodadorByToken(access_token)

  if (result.kind === "blocked") {
    return <BlockedView reason={result.reason} message={result.message} />
  }
  if (result.kind === "claim") {
    return (
      <ClaimView
        accessToken={access_token}
        nombre={result.nombre}
        asamblea={result.asamblea}
      />
    )
  }

  const asignaciones = await loadAsignaciones(access_token)

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <Link
        href={`/acomodador/${access_token}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[2rem] leading-[1.1] text-foreground sm:text-4xl sm:leading-tight">
        Asistencia
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Reporta cuántos lugares vacíos hay en el área que tienes asignada por
        sesión. Tu capitán lo verá en tiempo real.
      </p>

      {asignaciones.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          Aún no tienes área asignada. Cuando tu capitán te asigne, aparecerá
          aquí.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {asignaciones.map((a) => {
            const label = SLOT_LABEL[a.slot]
            return (
              <li
                key={a.asignacion_id}
                className="rounded-xl border bg-surface p-4"
              >
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {label?.dia} · {label?.sesion}
                </p>
                <p className="mt-1 text-base font-medium text-foreground">
                  {a.area_nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.area_piso}
                  {a.area_capacidad > 0 && ` · cap. ${a.area_capacidad}`}
                  {a.area_filas > 0 && ` · ${a.area_filas} filas`}
                </p>
                <LugaresVaciosForm
                  accessToken={access_token}
                  asignacionId={a.asignacion_id}
                  initialLugares={a.lugares_vacios}
                  reportadoAt={a.reportado_at}
                />
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
