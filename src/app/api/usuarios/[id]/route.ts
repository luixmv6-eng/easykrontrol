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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, status, session } = await verificarAdmin();
  if (error || !session) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const admin = createAdminClient();

  // Resetear contraseña directamente
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Mínimo 8 caracteres" }, { status: 400 });
    }
    const { error: pwErr } = await admin.auth.admin.updateUserById(params.id, { password: body.password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });
    await logAudit({ user_id: session.user.id, action: "usuario_creado", entity_type: "profiles", entity_id: params.id, metadata: { action: "password_reset" } });
    return NextResponse.json({ ok: true });
  }

  // Actualizar rol / proveedor_id / full_name / empresa_grupo
  const profileUpdates: Record<string, unknown> = {};
  if ("proveedor_id" in body) profileUpdates.proveedor_id = body.proveedor_id;
  if ("rol" in body) profileUpdates.rol = body.rol;
  if ("full_name" in body) profileUpdates.full_name = body.full_name;
  if ("empresa_grupo" in body) profileUpdates.empresa_grupo = body.empresa_grupo ?? null;

  const { data, error: upErr } = await admin
    .from("profiles")
    .update(profileUpdates)
    .eq("id", params.id)
    .select("id, username, full_name, rol, proveedor_id, empresa_grupo")
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logAudit({ user_id: session.user.id, action: "usuario_creado", entity_type: "profiles", entity_id: params.id, metadata: profileUpdates });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { error, status, session } = await verificarAdmin();
  if (error || !session) return NextResponse.json({ error }, { status });

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const admin = createAdminClient();

  // SET NULL en todas las tablas que referencian auth.users sin ON DELETE CASCADE
  // (defensa en profundidad: la migración v9 lo hace en BD, esto es un respaldo)
  await Promise.all([
    admin.from("proveedores").update({ created_by: null }).eq("created_by", params.id),
    admin.from("personal").update({ aprobado_por: null }).eq("aprobado_por", params.id),
    admin.from("grupos_ingreso").update({ creado_por: null }).eq("creado_por", params.id),
    admin.from("evaluaciones").update({ evaluado_por: null }).eq("evaluado_por", params.id),
    admin.from("revisiones_checklist").update({ revisado_por: null }).eq("revisado_por", params.id),
  ]);

  const { error: delErr } = await admin.auth.admin.deleteUser(params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await logAudit({
    user_id: session.user.id,
    action: "usuario_eliminado",
    entity_type: "profiles",
    entity_id: params.id,
    metadata: { action: "deleted" },
  });
  return NextResponse.json({ ok: true });
}
