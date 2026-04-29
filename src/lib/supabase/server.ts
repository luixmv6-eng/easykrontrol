// ══════════════════════════════════════════════════════
// src/lib/supabase/server.ts
// Cliente de Supabase para uso en el SERVIDOR
// (Server Components, Route Handlers, Server Actions)
// Lee y escribe cookies para mantener la sesión del usuario
// ══════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crea y retorna una instancia del cliente Supabase
 * para ser usada en el servidor (Server Components, API routes).
 * Lee/escribe cookies de Next.js para persistir la sesión.
 */
export async function createClient() {
  // Accede al almacén de cookies de Next.js (server-side)
  const cookieStore = await cookies();

  // Usa get/set/remove (API de @supabase/ssr v0.3.x)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // En Server Components el set puede fallar silenciosamente
          }
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, "", options);
          } catch {
            // En Server Components el set puede fallar silenciosamente
          }
        },
      },
    }
  );
}
