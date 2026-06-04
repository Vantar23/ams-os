import { PageHeader } from "@/components/page-header"
import { PautasAcomodadores } from "@/components/pautas-acomodadores"

export default function PautasPage() {
  return (
    <>
      <PageHeader parent="Asamblea" title="Pautas" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 lg:px-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Departamento de Acomodadores
          </p>
          <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">
            Pautas
          </h1>
        </header>

        <div className="mt-8">
          <PautasAcomodadores />
        </div>

        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Muchas gracias por su valioso trabajo en esta actividad teocrática.
        </p>
      </div>
    </>
  )
}
