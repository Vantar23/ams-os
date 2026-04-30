import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = new Set(["/", "/login", "/register"])
const PUBLIC_PREFIXES = [
  "/registro/",
  "/restablecer/",
  "/acomodador/",
  "/hermana-apoyo/",
]
const AUTH_ROUTES = new Set(["/login", "/register"])
const ACOMODADOR_PREFIX = "/acomodador/"
const HERMANA_APOYO_PREFIX = "/hermana-apoyo/"
const DEVICE_COOKIE = "acomodador_device_key"
const HERMANA_DEVICE_COOKIE = "hermana_apoyo_device_key"
const CAPITAN_ALLOWED_PREFIXES = [
  "/acomodadores",
  "/capitanes",
  "/hermanas-de-apoyo",
  "/disponibilidad",
]
const CAPITAN_LANDING = "/acomodadores"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // No insertes lógica entre createServerClient y getUser — getUser refresca
  // el JWT si está por expirar, y cualquier `await` previo puede invalidar la
  // sesión por un race con otra pestaña.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Asegura que cada navegador que abre un /acomodador/<token> trae un
  // device_key persistente. Lo seteamos antes de que la página corra para
  // que pueda leerlo y mandarlo al RPC acceso_open.
  if (
    path.startsWith(ACOMODADOR_PREFIX) &&
    !request.cookies.has(DEVICE_COOKIE)
  ) {
    const deviceKey = randomHex(32)
    request.cookies.set(DEVICE_COOKIE, deviceKey)
    response.cookies.set(DEVICE_COOKIE, deviceKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: ACOMODADOR_PREFIX,
      maxAge: 60 * 60 * 24 * 365 * 10,
    })
  }

  if (
    path.startsWith(HERMANA_APOYO_PREFIX) &&
    !request.cookies.has(HERMANA_DEVICE_COOKIE)
  ) {
    const deviceKey = randomHex(32)
    request.cookies.set(HERMANA_DEVICE_COOKIE, deviceKey)
    response.cookies.set(HERMANA_DEVICE_COOKIE, deviceKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: HERMANA_APOYO_PREFIX,
      maxAge: 60 * 60 * 24 * 365 * 10,
    })
  }

  const isPublic =
    PUBLIC_ROUTES.has(path) ||
    PUBLIC_PREFIXES.some((p) => path.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return redirectPreservingCookies(url, response)
  }

  if (user && AUTH_ROUTES.has(path)) {
    const url = request.nextUrl.clone()
    url.pathname = "/resumen"
    return redirectPreservingCookies(url, response)
  }

  // Capitán users are confined to the Personal section.
  if (user && !isPublic && !path.startsWith(ACOMODADOR_PREFIX)) {
    const role = await getCurrentRole(supabase, user.id)
    if (role === "capitan") {
      const allowed = CAPITAN_ALLOWED_PREFIXES.some(
        (p) => path === p || path.startsWith(p + "/"),
      )
      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = CAPITAN_LANDING
        return redirectPreservingCookies(url, response)
      }
    }
  }

  return response
}

async function getCurrentRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<"owner" | "capitan" | null> {
  const { data: asambleas } = await supabase
    .from("asambleas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
  const asambleaId = asambleas?.[0]?.id as string | undefined
  if (!asambleaId) return null
  const { data: miembro } = await supabase
    .from("asamblea_miembros")
    .select("role")
    .eq("asamblea_id", asambleaId)
    .eq("user_id", userId)
    .maybeSingle()
  return (miembro?.role as "owner" | "capitan" | undefined) ?? null
}

function redirectPreservingCookies(url: URL, source: NextResponse) {
  const redirect = NextResponse.redirect(url)
  source.cookies.getAll().forEach((c) => redirect.cookies.set(c))
  return redirect
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export const config = {
  matcher: [
    // Excluye Next internals e imágenes estáticas.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
