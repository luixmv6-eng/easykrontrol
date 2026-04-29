import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // 1. Verificar sesión y que el usuario sea admin (con cliente normal → sujeto a RLS)
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  // 2. Leer todos los perfiles con cliente admin (omite RLS)
  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const proveedor_id = searchParams.get("proveedor_id");

  let query = admin
    .from("profiles")
    .select("id, username, full_name, rol, proveedor_id, mfa_enabled, created_at")
    .order("username");

  if (proveedor_id) {
    query = query.eq("proveedor_id", proveedor_id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
