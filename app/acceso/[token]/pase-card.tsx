"use client"

import dynamic from "next/dynamic"

import type { LanyardData } from "./lanyard"

// El Canvas de R3F y la física de rapier (WASM) son solo de cliente.
const Lanyard = dynamic(() => import("./lanyard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-44 w-32 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  ),
})

export function PaseCard({ data }: { data: LanyardData }) {
  return (
    <div className="h-[68svh] w-full">
      <Lanyard data={data} />
    </div>
  )
}
