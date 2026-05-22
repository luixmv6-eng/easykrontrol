import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("rol, empresa_grupo")
    .eq("id", userId)
    .single();
  return data;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const profile = await getProfile(supabase, session.user.id);

  let query = supabase.from("proveedores").select("*").order("nombre");

  // Los admins globales (empresa_grupo = null) ven todos los proveedores
  // Los usuarios de un tenant solo ven los de su empresa
  if (profile?.empresa_grupo) {
    query = query.eq("empresa_grupo", profile.empresa_grupo);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const profile = await getProfile(supabase, session.user.id);
  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden crear empresas" }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, nit, email, telefono, direccion, representante, empresa_grupo } = body;

  if (!nombre?.trim() || !nit?.trim()) {
    return NextResponse.json({ error: "Nombre y NIT son obligatorios" }, { status: 400 });
  }
  if (!empresa_grupo || !["riopaila", "castilla"].includes(empresa_grupo)) {
    return NextResponse.json({ error: "Debes seleccionar a qué empresa pertenece (Riopaila o Castilla)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: nombre.trim(),
      nit: nit.trim(),
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
      representante: representante?.trim() || null,
      empresa_grupo,
      estado: "activo",
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe una empresa con ese NIT" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
