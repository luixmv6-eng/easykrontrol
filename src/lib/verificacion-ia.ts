import type { TipoDocumento, VerificacionResultado } from "@/types";

export async function verificarDocumento(
  fileBuffer: ArrayBuffer,
  url: string,
  tipoEsperado: TipoDocumento
): Promise<VerificacionResultado> {
  const verificadorUrl = process.env.VERIFICADOR_URL;
  if (!verificadorUrl) throw new Error("VERIFICADOR_URL no configurada");

  const base64 = Buffer.from(fileBuffer).toString("base64");
  const nombreArchivo = url.split("/").pop() ?? "documento";

  const res = await fetch(`${verificadorUrl}/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      archivo_base64: base64,
      nombre_archivo: nombreArchivo,
      tipo_esperado: tipoEsperado,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Verificador respondió ${res.status}: ${msg}`);
  }

  return res.json() as Promise<VerificacionResultado>;
}
