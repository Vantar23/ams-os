# Plan de cifrado de datos personales (telefono, nombre, apellido)

Objetivo: cifrar en reposo los datos personales identificables —teléfono,
nombre y apellido— para cumplir con las medidas de seguridad que exige la
LFPDPPP, sin romper el login por teléfono ni el orden alfabético de las
listas.

Enfoque elegido: **cifrado de columna dentro de Postgres (pgcrypto) con la
llave en Supabase Vault.** Los datos viajan ya por TLS y Supabase cifra el
disco; esto añade cifrado a nivel de campo para que un `SELECT` casual, una
réplica o un backup filtrado no expongan los datos en claro.

## Estado

- [x] **Base** — `supabase/migrations/20260620000001_pii_encryption_foundation.sql`
  - pgcrypto, esquema `private`, secreto `pii_encryption_key` en Vault,
    helpers `private.encrypt_pii(text)` / `private.decrypt_pii(bytea)`.
- [ ] **Conversión por tabla** (bloqueado: ver más abajo).
- [ ] **Actualización de los RPC** de login/registro (bloqueado).
- [ ] **Backfill** de datos existentes.
- [ ] **Verificación** y baja de las columnas en claro.

## Bloqueo actual: el esquema real no está en el repo

Los archivos `supabase/migrations/*_remote.sql` están vacíos. Las tablas con
estos campos (`capitanes`, `acomodadores`, `hermanas_apoyo`, `sub_aux`,
`accesos_pases`, columnas de contacto en `asambleas`) y los RPC que los leen/
escriben (`asistencia_general_lookup`, los de registro, etc.) viven solo en el
proyecto Supabase en vivo.

Para continuar necesito el esquema real en el repo. Exportarlo con:

```bash
# Trae a migrations/ el esquema y las funciones que hoy solo están en vivo
supabase db pull

# O un volcado solo-esquema (incluye cuerpos de las funciones/RPC)
supabase db dump --schema-only -f supabase/schema.sql
```

Con eso puedo escribir las migraciones de conversión exactas (tipos,
constraints, índices) y modificar los RPC para que cifren/descifren.

## Campos y tablas a cifrar

| Tabla              | Columnas                                              |
|--------------------|-------------------------------------------------------|
| `capitanes`        | `telefono`, `nombre`, `apellido`                      |
| `acomodadores`     | `telefono`, `nombre`, `apellido`                      |
| `hermanas_apoyo`   | `telefono`, `nombre`, `apellido`                      |
| `sub_aux`          | `telefono`, `nombre`, `apellido`                      |
| `accesos_pases`    | `telefono`, `nombre`                                  |
| `asambleas`        | `primeros_auxilios_telefono`, `seguridad_telefono`, `limpieza_telefono` |

(Confirmar la lista completa de columnas contra el esquema exportado.)

## Patrón de conversión por columna (transparente para la app)

La app lee estas columnas directo por PostgREST (`.select("telefono")`,
`.order("nombre")`). Para no reescribir cada lectura, por tabla:

1. Renombrar la tabla base a `<tabla>_priv` y mover ahí la columna cifrada
   `bytea` (p. ej. `telefono_enc`), o añadir las columnas `_enc` y eliminar
   las de texto al final.
2. Crear una **vista `<tabla>`** (mismo nombre que hoy) con
   `security_invoker`/`security_barrier` que expone
   `private.decrypt_pii(telefono_enc) as telefono`, etc. Las lecturas siguen
   igual.
3. Triggers `instead of insert/update` en la vista que cifran con
   `private.encrypt_pii(...)` antes de guardar. Las escrituras siguen igual.
4. Mantener las políticas RLS sobre la tabla base.

### Login por teléfono y orden alfabético

- **Igualdad por teléfono** (login/registro): como el descifrado ocurre en la
  BD, los RPC pueden comparar `private.decrypt_pii(telefono_enc) = p_telefono`
  sobre el subconjunto de la asamblea (listas pequeñas). No hace falta blind
  index con este enfoque. **Normalizar** ambos lados con la misma lógica que
  `lib/phone.ts` antes de comparar.
- **`ORDER BY nombre`**: ordenar por `private.decrypt_pii(nombre_enc)` dentro
  de la vista/consulta. Aceptable para listas por asamblea.

## Backfill

Migración transitoria que recorre cada tabla y rellena las columnas `_enc`
desde las de texto con `private.encrypt_pii(...)`, en lote. Solo tras
verificar que las vistas devuelven los valores correctos se eliminan las
columnas en claro.

## Verificación

- Login por teléfono (acomodador y hermana) sigue funcionando.
- Registro de capitán/acomodador/hermana/sub-aux guarda y recupera bien.
- Listas ordenadas alfabéticamente intactas.
- `SELECT * FROM <tabla>_priv` muestra `bytea` ilegible (no texto).

## Alcance / garantías

Protege contra: backups o réplicas filtrados, `SELECT` con un rol de solo
lectura, y exposición casual de la BD. **No** protege contra un compromiso
total con acceso a Vault (la llave vive en el mismo Supabase). Para esa amenaza
haría falta el enfoque a nivel de app con la llave fuera de la BD, que es mucho
más invasivo.
