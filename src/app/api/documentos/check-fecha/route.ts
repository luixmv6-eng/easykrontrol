import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { verificarDocumento } from "@/lib/verificacion-ia";
import { TIPO_DOCUMENTO_LABEL, type TipoDocumento } from "@/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const file = formData.get("file") as Blob | null;
  const tipo = formData.get("tipo") as TipoDocumento | null;

  if (!file || !tipo || !(tipo in TIPO_DOCUMENTO_LABEL)) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const label = TIPO_DOCUMENTO_LABEL[tipo];

  try {
    const buffer = await file.arrayBuffer();
    const resultado = await verificarDocumento(buffer, "", tipo, null);
    return NextResponse.json({
      fuera_de_rango:   resultado.fuera_de_rango,
      fecha_detectada:  resultado.fecha_vencimiento_detectada,
      label,
    });
  } catch {
    return NextResponse.json({ fuera_de_rango: false, fecha_detectada: null, label });
  }
}
