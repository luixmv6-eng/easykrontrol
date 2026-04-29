// ══════════════════════════════════════════════════════
// src/middleware.ts
// Middleware de Next.js para protección de rutas
// Se ejecuta ANTES de cada petición al servidor
// ══════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware principal de la aplicación.
 * - Refresca la sesión de Supabase en cada petición
 * - Redirige a /login si el usuario no está autenticado
 * - Redirige a /dashboard si el usuario ya está autenticado
 */
export async function middleware(request: NextRequest) {
  // Respuesta base que pasará las cookies actualizadas
  let supabaseResponse = NextResponse.next({
    request,
  });

  // ── Crear cliente de Supabase para el middleware ──
  // Usa get/set/remove (API de @supabase/ssr v0.3.x)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]);
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, "");
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set(name, "", options as Parameters<typeof supabaseResponse.cookies.set>[2]);
        },
      },
    }
  );

  // getSession decodifica el JWT localmente (sin llamada HTTP a Supabase),
  // lo que evita la latencia de red en cada navegación.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;

  // ── Rutas públicas que no requieren autenticación ──
  const publicRoutes = ["/login", "/auth/recovery", "/auth/callback", "/auth/reset-password"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // ── Redirigir a login si no hay sesión y la ruta es protegida ──
  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirigir a dashboard si ya hay sesión y se intenta ir al login ──
  if (user && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

/**
 * Configuración del matcher del middleware.
 * Excluye archivos estáticos y rutas internas de Next.js
 * para que el middleware no se ejecute en cada imagen/font/etc.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
