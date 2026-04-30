import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

async function verificarAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "No autorizado", status: 401, session: null };
  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", session.user.id).single();
  if (profile?.rol !== "admin") return { error: "Solo administradores", status: 403, session: null };
  return { error: null, status: 200, session };
}

export async function GET(request: Request) {
  const { error, status } = await verificarAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const proveedor_id = searchParams.get("proveedor_id");

  let query = admin
    .from("profiles")
    .select("id, username, full_name, rol, proveedor_id, mfa_enabled, created_at, proveedor:proveedores(nombre)")
    .order("created_at", { ascending: false });

  if (proveedor_id) query = query.eq("proveedor_id", proveedor_id);

  const { data, error: qErr } = await query;
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { error, status, session } = await verificarAdmin();
  if (error || !session) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const { email, password, rol, proveedor_id, full_name } = body as {
    email: string; password: string; rol: string; proveedor_id?: string; full_name?: string;
  };

  if (!email?.trim() || !password?.trim() || !rol) {
    return NextResponse.json({ error: "Email, contraseña y rol son requeridos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name?.trim() ?? "" },
  });

  if (authErr) {
    const msg = authErr.message.includes("already registered")
      ? "Ya existe un usuario con ese correo"
      : authErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await admin.from("profiles").update({
    rol,
    proveedor_id: proveedor_id ?? null,
    full_name: full_name?.trim() ?? null,
    username: email.trim().toLowerCase(),
  }).eq("id", authUser.user.id);

  await logAudit({
    user_id: session.user.id,
    action: "usuario_creado",
    entity_type: "profiles",
    entity_id: authUser.user.id,
    metadata: { email, rol, proveedor_id },
  });

  return NextResponse.json({ data: { id: authUser.user.id, email, rol } }, { status: 201 });
}
