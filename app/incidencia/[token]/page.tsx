import { ImageIcon } from "lucide-react"

import { createAdminClient } from "@/lib/supabase/admin"

import { ESTADO_LABEL, type EstadoIncidencia } from "@/app/(app)/incidencias/catalogo"

const BUCKET = "incidencias"
// El enlace viaja por WhatsApp y pueden abrirlo horas después; la URL de la
// foto se vuelve a firmar en cada visita, así que el TTL solo cubre la vista.
const SIGNED_TTL = 60 * 60

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Vista pública de UNA incidencia, pensada para compartirse por WhatsApp con
 * primeros auxilios. El token es un uuid por incidencia: quien tiene el
 * enlace ve solo este reporte, nada más del sistema.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!UUID_RE.test(token)) return <NoEncontrada />

  const admin = createAdminClient()
  const { data: incidencia } = await admin
    .from("incidencias")
    .select(
      "id, asamblea_id, tipo, ubicacion, descripcion, foto_path, estado, created_at, reportado_por_acomodador_id, reportado_por_hermana_id, reportado_por_capitan_id, reportado_por_user_id",
    )
    .eq("share_token", token)
    .maybeSingle()
  if (!incidencia) return <NoEncontrada />

  let fotoUrl: string | null = null
  if (incidencia.foto_path) {
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(incidencia.foto_path as string, SIGNED_TTL)
    fotoUrl = signed?.signedUrl ?? null
  }

  const reportante = await resolverReportante(admin, incidencia)

  const estado = incidencia.estado as EstadoIncidencia

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-5 sm:py-14">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Reporte de incidencia
      </p>
      <h1 className="mt-2 font-serif text-[1.75rem] leading-[1.15] text-foreground sm:text-4xl sm:leading-tight">
        {incidencia.tipo as string}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDate(incidencia.created_at as string)}
        {reportante && ` · Reportado por ${reportante}`}
        {" · "}
        {ESTADO_LABEL[estado] ?? estado}
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border bg-surface">
        <div className="flex items-center justify-center bg-muted">
          {fotoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fotoUrl}
              alt={incidencia.tipo as string}
              className="max-h-[70svh] w-full object-contain"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="grid gap-2 p-4">
          {incidencia.ubicacion ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Ubicación: </span>
              <span className="font-medium">
                {incidencia.ubicacion as string}
              </span>
            </p>
          ) : null}
          {incidencia.descripcion ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {incidencia.descripcion as string}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Este enlace muestra únicamente este reporte.
      </p>
    </main>
  )
}

async function resolverReportante(
  admin: ReturnType<typeof createAdminClient>,
  incidencia: {
    reportado_por_acomodador_id: string | null
    reportado_por_hermana_id: string | null
    reportado_por_capitan_id: string | null
    reportado_por_user_id: string | null
  },
): Promise<string | null> {
  const consulta = incidencia.reportado_por_acomodador_id
    ? { tabla: "acomodadores", id: incidencia.reportado_por_acomodador_id, sufijo: "" }
    : incidencia.reportado_por_hermana_id
      ? { tabla: "hermanas_apoyo", id: incidencia.reportado_por_hermana_id, sufijo: "" }
      : incidencia.reportado_por_capitan_id
        ? { tabla: "capitanes", id: incidencia.reportado_por_capitan_id, sufijo: " · Capitán" }
        : null
  if (!consulta) {
    return incidencia.reportado_por_user_id ? "Equipo" : null
  }
  const { data } = await admin
    .from(consulta.tabla)
    .select("nombre, apellido")
    .eq("id", consulta.id)
    .maybeSingle()
  if (!data) return null
  return (
    `${(data.nombre as string) ?? ""} ${(data.apellido as string) ?? ""}`.trim() +
    consulta.sufijo
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-2xl items-center justify-center px-5">
      <div className="text-center">
        <h1 className="font-serif text-2xl text-foreground">
          Reporte no disponible
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El enlace no es válido o el reporte fue eliminado.
        </p>
      </div>
    </main>
  )
}
