/**
 * Asientos de un área a partir del último reporte de "lugares vacíos".
 *
 * En un área con capacidad fija, los lugares vacíos SON los asientos
 * disponibles, y la asistencia es la capacidad menos esos vacíos. En un área
 * sin capacidad fija el reporte cuenta asistentes y no hay asientos que ofrecer
 * (`disponibles` queda en null).
 */
export function asientosDeReporte(
  capacidad: number,
  lugaresVacios: number | null,
): { disponibles: number | null; asistencia: number | null } {
  if (capacidad > 0) {
    if (lugaresVacios === null) return { disponibles: null, asistencia: null }
    const disponibles = Math.max(0, Math.min(capacidad, lugaresVacios))
    return { disponibles, asistencia: capacidad - disponibles }
  }
  if (lugaresVacios === null) return { disponibles: null, asistencia: null }
  return { disponibles: null, asistencia: Math.max(0, lugaresVacios) }
}
