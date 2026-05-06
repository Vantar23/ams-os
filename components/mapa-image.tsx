"use client"

import * as React from "react"
import { Dialog as RadixDialog } from "radix-ui"
import {
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch"

import { Button } from "@/components/ui/button"

export function MapaImage({ url, alt }: { url: string; alt: string }) {
  return (
    <RadixDialog.Root>
      <RadixDialog.Trigger asChild>
        <button
          type="button"
          className="block w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Abrir mapa ${alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} className="block h-auto w-full" />
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <RadixDialog.Title className="sr-only">{alt}</RadixDialog.Title>
          <RadixDialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-20 size-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <XIcon className="size-5" />
            </Button>
          </RadixDialog.Close>
          <TransformWrapper
            minScale={1}
            maxScale={8}
            doubleClick={{ mode: "reset" }}
            wheel={{ step: 0.2 }}
            pinch={{ step: 5 }}
            panning={{ velocityDisabled: true }}
          >
            <Controls />
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
              />
            </TransformComponent>
          </TransformWrapper>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => zoomOut()}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Alejar"
        >
          <MinusIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => resetTransform()}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Restablecer"
        >
          <RotateCcwIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => zoomIn()}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Acercar"
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
}
