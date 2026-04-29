import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
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

  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden modificar empresas" }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, nit, email, telefono, direccion, estado } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (nombre !== undefined) updates.nombre = nombre.trim();
  if (nit !== undefined) updates.nit = nit.trim();
  if (email !== undefined) updates.email = email?.trim() || null;
  if (telefono !== undefined) updates.telefono = telefono?.trim() || null;
  if (direccion !== undefined) updates.direccion = direccion?.trim() || null;
  if (estado !== undefined) updates.estado = estado;

  const { data, error } = await supabase
    .from("proveedores")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe una empresa con ese NIT" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
