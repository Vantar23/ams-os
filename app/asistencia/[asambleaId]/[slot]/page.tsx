import Link from "next/link"

import {
  DISPONIBILIDAD_DIAS,
  DISPONIBILIDAD_SESIONES,
  type DisponibilidadSlot,
} from "@/lib/disponibilidad"
import { createClient } from "@/lib/supabase/server"

import { AsistenciaGeneral } from "./asistencia-general"

const VALID_SLOTS: DisponibilidadSlot[] = DISPONIBILIDAD_DIAS.flatMap((d) =>
  DISPONIBILIDAD_SESIONES.map((s) => `${d.key}-${s.key}` as DisponibilidadSlot),
)

export default async function Page({
  params,
}: {
  params: Promise<{ asambleaId: string; slot: string }>
}) {
  const { asambleaId, slot } = await params
  if (!VALID_SLOTS.includes(slot as DisponibilidadSlot)) {
    return <Invalid reason="slot" />
  }

  const supabase = await createClient()
  const { data: asamblea } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .eq("id", asambleaId)
    .maybeSingle()

  if (!asamblea) {
    return <Invalid reason="asamblea" />
  }

  const dia = DISPONIBILIDAD_DIAS.find(
    (d) => slot.startsWith(d.key + "-"),
  )?.label
  const sesion = DISPONIBILIDAD_SESIONES.find((s) => slot.endsWith("-" + s.key))
    ?.label
  if (!dia || !sesion) return <Invalid reason="slot" />

  return (
    <AsistenciaGeneral
      asambleaId={asamblea.id as string}
      slot={slot as DisponibilidadSlot}
      dia={dia}
      sesion={sesion}
      asambleaLabel={`Asamblea N° ${asamblea.numero} — ${asamblea.edicion}`}
    />
  )
}

function Invalid({ reason }: { reason: "slot" | "asamblea" }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
          Enlace no válido
        </p>
        <h1 className="mt-3 font-serif text-[1.75rem] leading-tight text-foreground sm:text-3xl">
          {reason === "slot"
            ? "Sesión no reconocida"
            : "Asamblea no encontrada"}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Pídele a tu capitán que te envíe un enlace válido.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-foreground underline underline-offset-4"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
