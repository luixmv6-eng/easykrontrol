// ══════════════════════════════════════════════════════
// src/app/page.tsx
// Página raíz "/" — redirige al login o al dashboard
// según el estado de autenticación del usuario
// ══════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Verificar si hay sesión activa (server-side)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirigir según el estado de autenticación
  if (user) {
    // Usuario autenticado → ir al dashboard
    redirect("/dashboard");
  } else {
    // Sin sesión → ir al login
    redirect("/login");
  }
}
