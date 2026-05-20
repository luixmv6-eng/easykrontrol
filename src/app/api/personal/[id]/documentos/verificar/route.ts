import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { verificarDocumento } from "@/lib/verificacion-ia";
import type { TipoDocumento } from "@/types";

export async function POST(
  _req: Request,
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
    return NextResponse.json({ error: "Solo administradores pueden verificar" }, { status: 403 });

  const admin = createAdminClient();

  // Obtener todos los documentos de la persona
  const { data: documentos, error: docsErr } = await admin
    .from("documentos_personal")
    .select("id, tipo, url")
    .eq("personal_id", params.id);

  if (docsErr) return NextResponse.json({ error: docsErr.message }, { status: 500 });
  if (!documentos || documentos.length === 0) {
    return NextResponse.json({ data: { verificados: 0, resultados: [] } });
  }

  const resultados: {
    id: string;
    tipo: string;
    verificado: boolean;
    confianza: string;
    observacion: string;
  }[] = [];

  for (const doc of documentos) {
    try {
      // Descargar archivo desde Storage
      const { data: fileData, error: dlErr } = await admin.storage
        .from("documentos")
        .download(doc.url);

      if (dlErr || !fileData) {
        resultados.push({
          id: doc.id,
          tipo: doc.tipo,
          verificado: false,
          confianza: "baja",
          observacion: "No se pudo descargar el archivo",
        });
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const resultado = await verificarDocumento(buffer, doc.url, doc.tipo as TipoDocumento);

      const verificadoOk =
        resultado.es_correcto_tipo &&
        resultado.esta_vigente !== false &&
        resultado.confianza !== "baja";

      // Guardar resultado en la BD
      await admin
        .from("documentos_personal")
        .update({
          verificado_auto: verificadoOk,
          verificacion_confianza: resultado.confianza,
          verificacion_observacion: resultado.observacion,
          verificacion_resultado: resultado as unknown as Record<string, unknown>,
          verificado_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      resultados.push({
        id: doc.id,
        tipo: doc.tipo,
        verificado: verificadoOk,
        confianza: resultado.confianza,
        observacion: resultado.observacion,
      });
    } catch (err) {
      resultados.push({
        id: doc.id,
        tipo: doc.tipo,
        verificado: false,
        confianza: "baja",
        observacion: err instanceof Error ? err.message : "Error en verificación",
      });
    }
  }

  const verificadosCount = resultados.filter((r) => r.verificado).length;

  return NextResponse.json({
    data: {
      verificados: verificadosCount,
      total: resultados.length,
      resultados,
    },
  });
}
