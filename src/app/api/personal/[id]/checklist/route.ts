import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("revisiones_checklist")
    .select("*")
    .eq("personal_id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (profile?.rol !== "admin")
    return NextResponse.json({ error: "Solo administradores pueden revisar" }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("revisiones_checklist")
    .upsert(
      {
        personal_id: params.id,
        revisado_por: session.user.id,
        fecha_revision: new Date().toISOString(),
        ...body,
      },
      { onConflict: "personal_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    user_id: session.user.id,
    action: "checklist_revisado",
    entity_type: "personal",
    entity_id: params.id,
    metadata: { concepto: body.concepto },
  });

  return NextResponse.json({ data });
}
