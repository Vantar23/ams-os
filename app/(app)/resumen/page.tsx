import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"

const ASAMBLEA = {
  edicion: "Asamblea Regional 2026",
  titulo: "Manténganse alerta",
  fechas: "2 al 4 de octubre, 2026",
  sede: "Centro de Convenciones — Ciudad de México",
  estado: "En preparación",
}

const KPIS = [
  { label: "Días", value: "3", hint: "Vie · Sáb · Dom" },
  { label: "Sesiones", value: "6", hint: "Mañana y tarde" },
  { label: "Personal", value: "30", hint: "24 acomodadores · 6 capitanes" },
  { label: "Disponibilidad", value: "75%", hint: "18 de 24 confirmados" },
] as const

const HITOS = [
  {
    fecha: "18 ago 2026",
    titulo: "Cierre de captura de personal",
    detalle: "Última fecha para registrar acomodadores y capitanes.",
    estado: "Pendiente",
  },
  {
    fecha: "5 sep 2026",
    titulo: "Cierre de disponibilidad",
    detalle:
      "Cada hermano debe haber marcado las sesiones en las que puede servir.",
    estado: "Pendiente",
  },
  {
    fecha: "20 sep 2026",
    titulo: "Distribución de turnos",
    detalle: "Asignación final de puestos por sesión.",
    estado: "Pendiente",
  },
  {
    fecha: "1 oct 2026",
    titulo: "Ensayo general",
    detalle: "Reunión con capitanes y revisión de áreas.",
    estado: "Pendiente",
  },
] as const

const DEPARTAMENTOS = [
  { nombre: "Acomodadores", total: 24, completos: 18, href: "/acomodadores" },
  { nombre: "Capitanes", total: 6, completos: 6, href: "/capitanes" },
  { nombre: "Disponibilidad", total: 30, completos: 22, href: "/disponibilidad" },
] as const

export default function ResumenPage() {
  return (
    <>
      <PageHeader parent="Asamblea" title="Resumen" />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 lg:px-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {ASAMBLEA.edicion}
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">
            {ASAMBLEA.titulo}
          </h1>
          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-baseline gap-2">
              <dt className="text-xs uppercase tracking-[0.15em]">Fechas</dt>
              <dd className="text-foreground">{ASAMBLEA.fechas}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-xs uppercase tracking-[0.15em]">Sede</dt>
              <dd className="text-foreground">{ASAMBLEA.sede}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-xs uppercase tracking-[0.15em]">Estado</dt>
              <dd>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                  {ASAMBLEA.estado}
                </span>
              </dd>
            </div>
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
              Hitos
            </p>
            <h2 className="mt-2 font-serif text-2xl">Próximos pasos</h2>
            <ol className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
              {HITOS.map((h) => (
                <li key={h.titulo} className="flex gap-4 px-5 py-4">
                  <div className="w-28 shrink-0 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {h.fecha}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{h.titulo}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {h.detalle}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {h.estado}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Departamentos
            </p>
            <h2 className="mt-2 font-serif text-2xl">Estado del personal</h2>
            <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
              {DEPARTAMENTOS.map((d) => {
                const pct = Math.round((d.completos / d.total) * 100)
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
                          {d.completos} de {d.total} · {pct}%
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
