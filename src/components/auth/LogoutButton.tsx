"use client";

// ══════════════════════════════════════════════════════
// src/components/auth/LogoutButton.tsx
// Botón de cierre de sesión — Client Component
// Llama a supabase.auth.signOut() y redirige al login
// ══════════════════════════════════════════════════════

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Cerrar la sesión activa en Supabase (limpia las cookies)
    await supabase.auth.signOut();

    // Redirigir al login
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="
        flex items-center gap-1.5
        text-[12.5px] text-gray-500 hover:text-ek-600
        transition-colors font-medium
        disabled:opacity-60 disabled:pointer-events-none
      "
      aria-label="Cerrar sesión"
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <LogOut size={14} />
      )}
      Cerrar sesión
    </button>
  );
}
