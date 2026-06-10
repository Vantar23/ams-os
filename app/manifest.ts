import type { MetadataRoute } from "next"

// Sin `start_url`: al instalar desde un portal personal (/acomodador/<token>)
// la app debe abrir esa misma página, no la raíz.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AMS-OS — Gestión de asambleas",
    short_name: "AMS-OS",
    description:
      "Sistema operativo para coordinar departamentos, áreas y personal durante asambleas.",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6B7A5A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
