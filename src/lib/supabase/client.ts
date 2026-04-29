// ══════════════════════════════════════════════════════
// src/lib/supabase/client.ts
// Cliente de Supabase para uso en el NAVEGADOR (Client Components)
// Usa las variables NEXT_PUBLIC_* que son seguras de exponer al cliente
// ══════════════════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";

/**
 * Crea y retorna una instancia del cliente Supabase
 * para ser usada en componentes del lado del cliente (use client).
 * Maneja automáticamente las cookies de sesión.
 */
export function createClient() {
  return createBrowserClient(
    // URL pública del proyecto Supabase
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Clave anónima pública (safe to expose)
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
