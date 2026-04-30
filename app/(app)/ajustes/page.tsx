"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import {
  AsambleaFormFields,
  INITIAL_ASAMBLEA,
  type AsambleaFormValues,
} from "@/components/asamblea-form-fields"
import { Button } from "@/components/ui/button"

export default function AjustesPage() {
  const [values, setValues] = React.useState<AsambleaFormValues>(INITIAL_ASAMBLEA)
  const [saved, setSaved] = React.useState<AsambleaFormValues>(INITIAL_ASAMBLEA)
  const [showSaved, setShowSaved] = React.useState(false)

  const dirty = React.useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved),
    [values, saved]
  )

  function update<K extends keyof AsambleaFormValues>(k: K, v: AsambleaFormValues[K]) {
    setValues((s) => ({ ...s, [k]: v }))
    setShowSaved(false)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(values)
    setShowSaved(true)
  }

  function onReset() {
    setValues(saved)
    setShowSaved(false)
  }

  return (
    <>
      <PageHeader parent="Configuración" title="Ajustes" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 lg:px-10">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Configuración
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Ajustes de la asamblea
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Información que aparece en el resumen y los reportes generados.
          </p>
        </header>

        <form onSubmit={onSubmit} className="mt-10">
          <AsambleaFormFields values={values} onChange={update} />

          <div className="mt-10 flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {showSaved ? (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <CheckIcon className="size-3.5" /> Cambios guardados
                </span>
              ) : dirty ? (
                "Cambios sin guardar"
              ) : (
                "Sin cambios"
              )}
            </p>
            <div className="flex gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={!dirty}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={!dirty}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
