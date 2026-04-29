import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Crea un cliente admin con la Service Role Key (solo server-side)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "El correo electrónico es requerido." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    /*
     * generateLink con type "recovery" genera un enlace mágico de un solo uso.
     * El usuario hace clic → /auth/callback → /auth/reset-password
     * donde puede ingresar su nueva contraseña.
     * El enlace expira en 1 hora.
     */
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${origin}/auth/callback?type=recovery`,
      },
    });

    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { error: "No se encontró ningún usuario con ese correo o hubo un error al generar el enlace." },
        { status: 400 }
      );
    }

    return NextResponse.json({ link: data.properties.action_link });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
