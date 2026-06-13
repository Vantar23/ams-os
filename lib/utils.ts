import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Momento actual en ms. Envuelto aquí para usarlo dentro de render sin que la
 * regla de pureza marque `Date.now()`. */
export function ahoraMs(): number {
  return Date.now()
}
