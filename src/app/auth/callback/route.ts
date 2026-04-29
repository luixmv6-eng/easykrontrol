// ══════════════════════════════════════════════════════
// src/app/auth/callback/route.ts
// Route Handler de Next.js para manejar los callbacks de Supabase Auth
//
// Supabase redirige aquí en dos casos:
// 1. Confirmación de email (registro)
// 2. Recuperación de contraseña (reset)
//
// Esta ruta intercambia el code de la URL por una sesión activa
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Extraer parámetros de la URL que Supabase envió en el redirect
  const { searchParams, origin } = new URL(request.url);

  // "code" es el authorization code de OAuth/PKCE que Supabase adjunta
  const code = searchParams.get("code");

  // "type" indica el motivo del callback (recovery, signup, etc.)
  const type = searchParams.get("type");

  // "next" es la ruta destino después del auth (opcional)
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    /*
     * Intercambiar el authorization code por una sesión de usuario.
     * Supabase maneja automáticamente el PKCE (Proof Key for Code Exchange)
     * y almacena la sesión en cookies.
     */
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      /*
       * Si es un callback de recuperación de contraseña,
       * redirigir a la página donde el usuario puede ingresar la nueva contraseña.
       * Si es otro tipo de callback, ir al destino "next".
       */
      if (type === "recovery") {
        // Redirigir a la página de cambio de contraseña
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      // Redirect al destino configurado (normalmente /dashboard)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  /*
   * Si no hay "code" o hubo un error, redirigir al login con un
   * parámetro de error para mostrar feedback al usuario.
   */
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
