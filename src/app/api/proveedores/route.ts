import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden crear empresas" }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, nit, email, telefono, direccion } = body;

  if (!nombre?.trim() || !nit?.trim()) {
    return NextResponse.json({ error: "Nombre y NIT son obligatorios" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: nombre.trim(),
      nit: nit.trim(),
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      direccion: direccion?.trim() || null,
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
