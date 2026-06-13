import Link from "next/link"
import { ArmchairIcon, ArrowLeftIcon } from "lucide-react"

import { asientosDeReporte } from "@/lib/asientos"
import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  momentoEnRecinto,
  slotsVisibles,
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
    return <BlockedView reason={result.reason} message={result.message} accessToken={access_token} />
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

  const todas = await loadAsignaciones(access_token)
  // Solo el turno en curso (el primero vigente), no todos los visibles.
  const slotVigente =
    slotsVisibles(todas.map((a) => a.slot), momentoEnRecinto())[0] ?? null
  const asignaciones = slotVigente
    ? todas.filter((a) => a.slot === slotVigente)
    : []

  return (
    <main className="mx-auto w-full max-w-2xl overflow-x-clip px-4 py-6 sm:px-5 sm:py-14">
      <Link
        href={`/acomodador/${access_token}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver
      </Link>
      <h1 className="mt-4 font-serif text-[1.75rem] leading-[1.15] text-foreground sm:text-4xl sm:leading-tight">
        Asistencia
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reporta el conteo del área asignada por sesión. Tu capitán lo verá en
        tiempo real.
      </p>

      {asignaciones.length > 0 && (
        <section className="mt-6 rounded-xl border bg-surface p-4">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <ArmchairIcon className="size-4" />
            Asientos disponibles en tu sección
          </p>
          <ul className="mt-3 grid gap-2">
            {asignaciones.map((a) => {
              const { disponibles } = asientosDeReporte(
                a.area_capacidad,
                a.lugares_vacios,
              )
              return (
                <li
                  key={a.asignacion_id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {a.area_nombre}
                  </span>
                  {a.area_capacidad === 0 ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Sin capacidad fija
                    </span>
                  ) : disponibles === null ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Sin reporte
                    </span>
                  ) : (
                    <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">
                      {disponibles}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        de {a.area_capacidad}
                      </span>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {asignaciones.length === 0 ? (
        <p className="mt-6 rounded-xl border bg-surface p-6 text-center text-sm text-muted-foreground">
          {todas.length === 0
            ? "Aún no tienes área asignada. Cuando tu capitán te asigne, aparecerá aquí."
            : "No tienes puesto asignado en este turno."}
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
                  areaCapacidad={a.area_capacidad}
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
