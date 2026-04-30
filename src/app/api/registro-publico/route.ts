import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { crearNotificacionAdmins } from "@/lib/notifications";

export async function POST(request: Request) {
  const formData = await request.formData();

  const proveedor_id = formData.get("proveedor_id") as string;
  const nombres = (formData.get("nombres") as string)?.trim();
  const cedula = (formData.get("cedula") as string)?.trim();
  const fecha_entrada = formData.get("fecha_entrada") as string | null;
  const fecha_fin = formData.get("fecha_fin") as string | null;

  if (!proveedor_id || !nombres || !cedula) {
    return NextResponse.json({ error: "Empresa, nombre y cédula son requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: personal, error: pErr } = await admin
    .from("personal")
    .insert({
      proveedor_id,
      nombres,
      cedula,
      fecha_entrada: fecha_entrada || null,
      fecha_fin: fecha_fin || null,
      estado: "pendiente",
    })
    .select("id")
    .single();

  if (pErr) {
    if (pErr.code === "23505") {
      return NextResponse.json({ error: "Esta cédula ya está registrada para este proveedor" }, { status: 409 });
    }
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const tiposDoc = [
    { campo: "cedula_doc", tipo: "cedula" },
    { campo: "licencia_doc", tipo: "licencia" },
    { campo: "arl_doc", tipo: "arl" },
  ];

  for (const { campo, tipo } of tiposDoc) {
    const file = formData.get(campo) as File | null;
    if (!file || file.size === 0) continue;

    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${proveedor_id}/${personal.id}/${tipo}_${Date.now()}.${ext}`;
    const buffer = await file.arrayBuffer();

    const { error: upErr } = await admin.storage
      .from("documentos")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (upErr) continue;

    await admin.from("documentos_personal").insert({
      personal_id: personal.id,
      tipo,
      url: path,
      nombre_archivo: file.name,
    });
  }

  await crearNotificacionAdmins(
    "personal_pendiente",
    `Nueva solicitud de ingreso: ${nombres} (${cedula}) está pendiente de aprobación.`,
    { personal_id: personal.id, proveedor_id }
  );

  return NextResponse.json({ ok: true, id: personal.id }, { status: 201 });
}
