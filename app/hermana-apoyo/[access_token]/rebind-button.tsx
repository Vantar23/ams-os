"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

import { rebindAccess } from "./actions"

export function RebindButton({ accessToken }: { accessToken: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onClick() {
    setError(null)
    setSubmitting(true)
    const { ok, error: err } = await rebindAccess(accessToken)
    setSubmitting(false)
    if (!ok) {
      setError(err)
      return
    }
    router.refresh()
  }

  return (
    <div className="mt-8 grid gap-3">
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={onClick}
        disabled={submitting}
      >
        {submitting ? "Cambiando…" : "Usar este dispositivo"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Cierra la sesión del dispositivo anterior y activa el enlace aquí.
      </p>
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
