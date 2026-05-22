"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import {
  AsambleaFormFields,
  type AsambleaFormValues,
} from "@/components/asamblea-form-fields"
import { Button } from "@/components/ui/button"

import { actualizarAsamblea } from "./actions"

type Props = {
  initial: AsambleaFormValues
}

export function AjustesClient({ initial }: Props) {
  const router = useRouter()
  const [values, setValues] = React.useState<AsambleaFormValues>(initial)
  const [saved, setSaved] = React.useState<AsambleaFormValues>(initial)
  const [showSaved, setShowSaved] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const dirty = React.useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved),
    [values, saved],
  )

  function update<K extends keyof AsambleaFormValues>(
    k: K,
    v: AsambleaFormValues[K],
  ) {
    setValues((s) => ({ ...s, [k]: v }))
    setShowSaved(false)
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await actualizarAsamblea(values)
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setSaved(values)
    setShowSaved(true)
    router.refresh()
  }

  function onReset() {
    setValues(saved)
    setShowSaved(false)
    setError(null)
  }

  return (
    <form onSubmit={onSubmit} className="mt-10">
      <AsambleaFormFields values={values} onChange={update} />

      {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

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
            disabled={!dirty || submitting}
          >
            Descartar
          </Button>
          <Button type="submit" disabled={!dirty || submitting}>
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  )
}
