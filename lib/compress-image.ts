// Reduce el peso de una foto antes de subirla. Mantiene el aspecto,
// redimensiona el lado más largo a `maxDimension` y re-encodea como JPEG.
// Si el navegador no puede decodificar el archivo (p.ej. HEIC en algunos
// navegadores), devuelve el archivo original sin tocarlo.

export type CompressOptions = {
  maxDimension?: number
  quality?: number
  mimeType?: "image/jpeg" | "image/webp"
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? 1600
  const quality = options.quality ?? 0.82
  const mimeType = options.mimeType ?? "image/jpeg"

  if (!file.type.startsWith("image/")) return file
  if (typeof document === "undefined") return file

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const { width, height } = bitmap
  if (width === 0 || height === 0) {
    bitmap.close?.()
    return file
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close?.()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close?.()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality)
  })
  if (!blob) return file

  // Si por alguna razón el resultado pesa más, quédate con el original.
  if (blob.size >= file.size) return file

  const ext = mimeType === "image/webp" ? "webp" : "jpg"
  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto"
  return new File([blob], `${baseName}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  })
}
