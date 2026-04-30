export const AREAS_CAPITAN = [
  "Entrada",
  "Sala principal",
  "Estacionamiento",
  "Primeros auxilios",
  "Niños",
  "Bautismos",
] as const

export type AreaCapitan = (typeof AREAS_CAPITAN)[number]
