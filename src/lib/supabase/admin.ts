import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service_role key.
 * Omite RLS — usar SOLO en rutas de servidor para operaciones de administrador.
 * NUNCA importar desde componentes "use client".
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
