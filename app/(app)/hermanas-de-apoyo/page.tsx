import { PageHeader } from "@/components/page-header"

export default function HermanasDeApoyoPage() {
  return (
    <>
      <PageHeader parent="Personal" title="Hermanas de Apoyo" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">Hermanas de Apoyo</h2>
          <p className="text-sm text-muted-foreground">
            Próximamente.
          </p>
        </div>
      </div>
    </>
  )
}
