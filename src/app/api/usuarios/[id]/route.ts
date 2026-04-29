import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Verificar sesión y que el usuario sea admin (con cliente normal → sujeto a RLS)
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (adminProfile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  // 2. Actualizar el perfil con cliente admin (omite RLS)
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ("proveedor_id" in body) updates.proveedor_id = body.proveedor_id;
  if ("rol" in body) updates.rol = body.rol;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", params.id)
    .select("id, username, full_name, rol, proveedor_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
