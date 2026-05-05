import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

type Asamblea = {
  id: string
  numero: number | string | null
  edicion: string | null
  titulo: string | null
  fechas: string | null
  sede: string | null
  estado: string | null
  dias_count: number | null
  dias_label: string | null
  sesiones_count: number | null
  sesiones_label: string | null
}

type Area = {
  id: string
  piso: string | null
  nombre: string | null
  acomodadores_necesarios: number | null
  capacidad: number | null
}

type Persona = { id: string; disponibilidad: string[] | null }

export default async function ResumenPage() {
  const supabase = await createClient()

  const { data: asambleas } = await supabase
    .from("asambleas")
    .select(
      "id, numero, edicion, titulo, fechas, sede, estado, dias_count, dias_label, sesiones_count, sesiones_label",
    )
    .order("created_at", { ascending: false })
    .limit(1)

  const asamblea = asambleas?.[0] as Asamblea | undefined

  if (!asamblea) {
    return (
      <>
        <PageHeader parent="Asamblea" title="Resumen" />
        <div className="flex flex-1 items-center justify-center p-10">
          <div className="max-w-md text-center">
            <h2 className="font-serif text-2xl">Aún no tienes una asamblea</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Crea tu primera asamblea para ver el resumen.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register">Crear asamblea</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  const [
    { data: capitanes },
    { data: acomodadores },
    { data: hermanas },
    { data: areas },
    { count: asignacionesCount },
  ] = await Promise.all([
    supabase
      .from("capitanes")
      .select("id, disponibilidad")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("acomodadores")
      .select("id, disponibilidad")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("hermanas_apoyo")
      .select("id, disponibilidad")
      .eq("asamblea_id", asamblea.id),
    supabase
      .from("areas")
      .select("id, piso, nombre, acomodadores_necesarios, capacidad")
      .eq("asamblea_id", asamblea.id)
      .order("piso", { ascending: true })
      .order("nombre", { ascending: true }),
    supabase
      .from("asignaciones")
      .select("acomodador_id", { count: "exact", head: true })
      .eq("asamblea_id", asamblea.id),
  ])

  const withSlots = (rows: Persona[] | null) =>
    (rows ?? []).filter((r) => (r.disponibilidad?.length ?? 0) > 0).length

  const capitanesList = (capitanes ?? []) as Persona[]
  const acomodadoresList = (acomodadores ?? []) as Persona[]
  const hermanasList = (hermanas ?? []) as Persona[]
  const areasList = (areas ?? []) as Area[]

  const totalPersonal =
    capitanesList.length + acomodadoresList.length + hermanasList.length

  const acomodadoresNecesarios = areasList.reduce(
    (sum, a) => sum + (a.acomodadores_necesarios ?? 0),
    0,
  )
  const capacidadTotal = areasList.reduce(
    (sum, a) => sum + (a.capacidad ?? 0),
    0,
  )

  const KPIS = [
    {
      label: "Días",
      value: asamblea.dias_count != null ? String(asamblea.dias_count) : "—",
      hint: asamblea.dias_label ?? "Sin detalle",
    },
    {
      label: "Sesiones",
      value:
        asamblea.sesiones_count != null
          ? String(asamblea.sesiones_count)
          : "—",
      hint: asamblea.sesiones_label ?? "Sin detalle",
    },
    {
      label: "Personal",
      value: String(totalPersonal),
      hint: `${acomodadoresList.length} acomodadores · ${capitanesList.length} capitanes · ${hermanasList.length} hermanas`,
    },
    {
      label: "Áreas",
      value: String(areasList.length),
      hint:
        areasList.length === 0
          ? "Sin áreas registradas"
          : `${capacidadTotal} asientos · ${acomodadoresNecesarios} acomodadores necesarios`,
    },
  ] as const

  const DEPARTAMENTOS = [
    {
      nombre: "Acomodadores",
      total: acomodadoresList.length,
      completos: withSlots(acomodadoresList),
      href: "/acomodadores",
    },
    {
      nombre: "Capitanes",
      total: capitanesList.length,
      completos: withSlots(capitanesList),
      href: "/capitanes",
    },
    {
      nombre: "Hermanas de apoyo",
      total: hermanasList.length,
      completos: withSlots(hermanasList),
      href: "/hermanas-de-apoyo",
    },
  ] as const

  return (
    <>
      <PageHeader parent="Asamblea" title="Resumen" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 lg:px-10">
        <header>
          {asamblea.edicion && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {asamblea.edicion}
            </p>
          )}
          <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">
            {asamblea.titulo ?? "Asamblea"}
          </h1>
          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {asamblea.fechas && (
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.15em]">Fechas</dt>
                <dd className="text-foreground">{asamblea.fechas}</dd>
              </div>
            )}
            {asamblea.sede && (
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.15em]">Sede</dt>
                <dd className="text-foreground">{asamblea.sede}</dd>
              </div>
            )}
            {asamblea.estado && (
              <div className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-[0.15em]">Estado</dt>
                <dd>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                    {asamblea.estado}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </header>

        <section className="mt-10 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-surface p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {k.label}
              </p>
              <p className="mt-2 font-serif text-3xl text-foreground">
                {k.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </div>
          ))}
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Lugar
            </p>
            <h2 className="mt-2 font-serif text-2xl">Áreas y puestos</h2>
            {areasList.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border bg-surface px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aún no has registrado áreas.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/areas">Registrar áreas</Link>
                </Button>
              </div>
            ) : (
              <>
                <ol className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
                  {areasList.map((a) => (
                    <li key={a.id} className="flex gap-4 px-5 py-4">
                      <div className="w-28 shrink-0 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                        {a.piso ?? "—"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {a.nombre ?? "Sin nombre"}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {a.acomodadores_necesarios ?? 0} acomodadores
                          {a.capacidad != null
                            ? ` · capacidad ${a.capacidad}`
                            : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">
                  {areasList.length} áreas ·{" "}
                  {acomodadoresNecesarios} acomodadores necesarios ·{" "}
                  {capacidadTotal} asientos · {asignacionesCount ?? 0} puestos
                  asignados
                </p>
              </>
            )}
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Departamentos
            </p>
            <h2 className="mt-2 font-serif text-2xl">Estado del personal</h2>
            <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
              {DEPARTAMENTOS.map((d) => {
                const pct =
                  d.total === 0 ? 0 : Math.round((d.completos / d.total) * 100)
                return (
                  <li key={d.nombre}>
                    <Link
                      href={d.href}
                      className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-background"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {d.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {d.total === 0
                            ? "Sin personal registrado"
                            : `${d.completos} de ${d.total} con disponibilidad · ${pct}%`}
                        </p>
                      </div>
                      <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <section className="mt-12 border-t border-border pt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Notas
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Los datos mostrados son indicadores agregados. Para detalle por
            persona o por área, abre la sección correspondiente en el menú
            lateral.
          </p>
        </section>
      </div>
    </>
  )
}
