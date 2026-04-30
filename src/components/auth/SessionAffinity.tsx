"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

const TAB_SESSION_KEY = "ek_tab_session";

/**
 * Guarda la sesión activa de cada pestaña en sessionStorage (aislado por pestaña).
 * Cuando el usuario vuelve a la pestaña, compara la cookie de sesión actual con la
 * sesión guardada de esta pestaña. Si otra pestaña cambió de cuenta, restaura la
 * sesión correcta para esta pestaña automáticamente.
 */
export function SessionAffinity() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const restoreTabSession = async () => {
      const raw = sessionStorage.getItem(TAB_SESSION_KEY);
      if (!raw) return;

      try {
        const tabSession: Session = JSON.parse(raw);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Si otra pestaña inició sesión con otra cuenta, restauramos la de esta pestaña
        if (session?.user?.id !== tabSession.user.id) {
          const { error } = await supabase.auth.setSession({
            access_token: tabSession.access_token,
            refresh_token: tabSession.refresh_token,
          });
          if (error) {
            sessionStorage.removeItem(TAB_SESSION_KEY);
          } else {
            router.refresh();
          }
        }
      } catch {
        sessionStorage.removeItem(TAB_SESSION_KEY);
      }
    };

    // Guarda la sesión de esta pestaña cada vez que cambia el estado auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        sessionStorage.setItem(TAB_SESSION_KEY, JSON.stringify(session));
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(TAB_SESSION_KEY);
      }
    });

    restoreTabSession();
    window.addEventListener("focus", restoreTabSession);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", restoreTabSession);
    };
  }, [router]);

  return null;
}
