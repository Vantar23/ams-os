"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"

import "react-day-picker/style.css"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("ar-calendar", className)}
      style={
        {
          "--rdp-accent-color": "var(--color-primary)",
          "--rdp-accent-background-color": "color-mix(in oklab, var(--color-primary) 14%, transparent)",
          "--rdp-today-color": "var(--color-primary)",
          "--rdp-day_button-border-radius": "var(--radius-md)",
          "--rdp-day_button-border": "1px solid transparent",
          "--rdp-day-height": "2.5rem",
          "--rdp-day-width": "2.5rem",
          "--rdp-day_button-height": "2.25rem",
          "--rdp-day_button-width": "2.25rem",
          "--rdp-nav-height": "2.25rem",
          "--rdp-weekday-opacity": "1",
          "--rdp-outside-opacity": "0.45",
        } as React.CSSProperties
      }
      classNames={{
        month_caption:
          "flex h-9 items-center justify-center px-2 font-serif text-base capitalize",
        caption_label: "font-serif",
        weekday:
          "text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground",
        button_previous:
          "inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        button_next:
          "inline-flex items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Calendar }
