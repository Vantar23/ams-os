import { redirect } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { createClient } from "@/lib/supabase/server"
import { ahoraMs } from "@/lib/utils"

import { AvisoCard, type AvisoResumen } from "./aviso-card"
import { AvisoForm } from "./aviso-form"

const ADMIN_ROLES = ["owner", "subcapitan", "auxiliar"]

type AvisoRow = {
  id: string
  tipo: "aviso" | "pregunta"
  titulo: string
  cuerpo: string | null
  opcion_a: string | null
  opcion_b: string | null
  audiencias: ("acomodador" | "capitan" | "hermana")[]
  expira_at: string | null
  archivado: boolean
  created_at: string
}

export default async function AvisosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined

  if (!asambleaId) {
    return (
      <>
        <PageHeader title="Avisos" />
        <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">
          Crea una asamblea para poder enviar avisos.
        </div>
      </>
    )
  }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", user.id)
    .maybeSingle()
  const role = miembro?.role as string | undefined
  // Los capitanes solo reciben avisos; no entran a esta sección.
  if (!role || !ADMIN_ROLES.includes(role)) redirect("/resumen")

  // Avisos de la asamblea (más recientes primero).
  const { data: avisosData } = await supabase
    .from("avisos")
    .select(
      "id, tipo, titulo, cuerpo, opcion_a, opcion_b, audiencias, expira_at, archivado, created_at",
    )
    .eq("asamblea_id", asambleaId)
    .order("created_at", { ascending: false })
  const avisos = (avisosData ?? []) as AvisoRow[]

  // Destinatarios que pueden recibir el overlay, por audiencia.
  const [acomodadores, hermanas, capitanes] = await Promise.all([
    supabase
      .from("acomodadores")
      .select("id", { count: "exact", head: true })
      .eq("asamblea_id", asambleaId)
      .not("device_bound_at", "is", null),
    supabase
      .from("hermanas_apoyo")
      .select("id", { count: "exact", head: true })
      .eq("asamblea_id", asambleaId)
      .not("device_bound_at", "is", null),
    supabase
      .from("capitanes")
      .select("id", { count: "exact", head: true })
      .eq("asamblea_id", asambleaId)
      .not("user_id", "is", null),
  ])
  const totalPorAudiencia: Record<"acomodador" | "capitan" | "hermana", number> =
    {
      acomodador: acomodadores.count ?? 0,
      hermana: hermanas.count ?? 0,
      capitan: capitanes.count ?? 0,
    }

  // Respuestas (lecturas) de todos los avisos.
  const avisoIds = avisos.map((a) => a.id)
  const respuestasPorAviso = new Map<
    string,
    { total: number; a: number; b: number }
  >()
  if (avisoIds.length > 0) {
    const { data: respuestas } = await supabase
      .from("avisos_respuestas")
      .select("aviso_id, opcion")
      .in("aviso_id", avisoIds)
    for (const r of (respuestas ?? []) as {
      aviso_id: string
      opcion: "a" | "b" | null
    }[]) {
      const acc = respuestasPorAviso.get(r.aviso_id) ?? { total: 0, a: 0, b: 0 }
      acc.total += 1
      if (r.opcion === "a") acc.a += 1
      if (r.opcion === "b") acc.b += 1
      respuestasPorAviso.set(r.aviso_id, acc)
    }
  }

  const ahora = ahoraMs()
  const resumenes: AvisoResumen[] = avisos.map((a) => {
    const stats = respuestasPorAviso.get(a.id) ?? { total: 0, a: 0, b: 0 }
    const esperados = a.audiencias.reduce(
      (sum, aud) => sum + (totalPorAudiencia[aud] ?? 0),
      0,
    )
    const caducado = a.expira_at !== null && new Date(a.expira_at).getTime() <= ahora
    return {
      id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      cuerpo: a.cuerpo,
      opcionA: a.opcion_a,
      opcionB: a.opcion_b,
      audiencias: a.audiencias,
      expiraAt: a.expira_at,
      archivado: a.archivado,
      caducado,
      createdAt: a.created_at,
      leidos: stats.total,
      esperados,
      votosA: stats.a,
      votosB: stats.b,
    }
  })

  return (
    <>
      <PageHeader title="Avisos" />
      <div className="flex flex-1 flex-col gap-8 p-4 sm:p-6">
        <AvisoForm />
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Avisos enviados
          </h2>
          {resumenes.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aún no has enviado ningún aviso.
            </p>
          ) : (
            <div className="grid gap-3">
              {resumenes.map((r) => (
                <AvisoCard key={r.id} aviso={r} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
