import Link from "next/link"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

import { IncidenciasClient, type IncidenciaItem } from "./incidencias-client"

const BUCKET = "incidencias"
const SIGNED_TTL = 60 * 60

export default async function IncidenciasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id, numero, edicion")
    .order("created_at", { ascending: false })
    .limit(1)
  const asamblea = asambleas?.[0]

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Reportes" title="Incidencias" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para empezar a registrar incidencias.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asamblea.id)
    .eq("user_id", user.id)
    .maybeSingle()
  const role = miembro?.role as string | undefined

  if (role !== "owner" && role !== "capitan") {
    return (
      <>
        <PageHeader parent="Reportes" title="Incidencias" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Sin acceso</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Solo el propietario y los capitanes pueden ver esta lista.
            </p>
          </div>
        </div>
      </>
    )
  }

  const { data: rows } = await supabase
    .from("incidencias")
    .select(
      "id, tipo, ubicacion, descripcion, foto_path, estado, created_at, reportado_por_acomodador_id, reportado_por_user_id",
    )
    .eq("asamblea_id", asamblea.id)
    .order("created_at", { ascending: false })

  const baseItems = (rows ?? []) as Array<
    Omit<IncidenciaItem, "foto_url" | "reporter_label"> & {
      foto_path: string | null
      reportado_por_acomodador_id: string | null
      reportado_por_user_id: string | null
    }
  >

  const fotoPaths = baseItems
    .map((r) => r.foto_path)
    .filter((p): p is string => Boolean(p))
  const urlByPath = new Map<string, string>()
  if (fotoPaths.length > 0) {
    const admin = createAdminClient()
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(fotoPaths, SIGNED_TTL)
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
    }
  }

  const acomodadorIds = Array.from(
    new Set(
      baseItems
        .map((r) => r.reportado_por_acomodador_id)
        .filter((v): v is string => Boolean(v)),
    ),
  )
  const acomodadorMap = new Map<string, string>()
  if (acomodadorIds.length > 0) {
    const { data: acos } = await supabase
      .from("acomodadores")
      .select("id, nombre, apellido")
      .in("id", acomodadorIds)
    for (const a of acos ?? []) {
      acomodadorMap.set(a.id, `${a.nombre ?? ""} ${a.apellido ?? ""}`.trim())
    }
  }

  const items: IncidenciaItem[] = baseItems.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    ubicacion: r.ubicacion,
    descripcion: r.descripcion,
    estado: r.estado as IncidenciaItem["estado"],
    created_at: r.created_at,
    foto_url: r.foto_path ? urlByPath.get(r.foto_path) ?? null : null,
    reporter_label: r.reportado_por_acomodador_id
      ? acomodadorMap.get(r.reportado_por_acomodador_id) ?? "Acomodador"
      : r.reportado_por_user_id
        ? "Equipo"
        : "—",
  }))

  return (
    <>
      <PageHeader parent="Reportes" title="Incidencias" />
      <IncidenciasClient asamblea={asamblea} items={items} />
    </>
  )
}
