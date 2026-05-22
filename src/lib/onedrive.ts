/**
 * Integración con Microsoft OneDrive for Business via Graph API.
 * Al aprobar un trabajador, sube sus documentos a:
 *   Contratistas/{Empresa}/{Nombre - Cédula}/
 *
 * Variables de entorno requeridas:
 *   AZURE_TENANT_ID       — ID del tenant (directorio) de Azure AD
 *   AZURE_CLIENT_ID       — ID de la aplicación registrada en Azure
 *   AZURE_CLIENT_SECRET   — Secreto de la aplicación
 *   ONEDRIVE_USER         — Email del usuario cuyo OneDrive se usa (ej: admin@empresa.com)
 */

import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH = "https://graph.microsoft.com/v1.0";

const TIPO_NOMBRES: Record<string, string> = {
  cedula:                    "01 - Cedula",
  licencia:                  "02 - Licencia Conduccion",
  arl:                       "03 - ARL",
  soat:                      "04 - SOAT",
  tecnicomecanica:           "05 - Tecnomecanica",
  planilla_aportes:          "06 - Planilla PILA",
  examenes_medicos:          "07 - Examenes Medicos",
  certificados_especialidad: "08 - Certificado Especialidad",
  arl_sgsst:                 "09 - ARL SG-SST",
  responsable_sgsst:         "10 - Responsable SG-SST",
};

// Elimina caracteres inválidos en nombres de carpeta/archivo de Windows y OneDrive
function safe(nombre: string): string {
  return nombre
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// ── Autenticación (client credentials) ───────────────────────────────────────
async function getToken(): Promise<string> {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error("Faltan variables AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET");
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope:         "https://graph.microsoft.com/.default",
      }).toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error autenticando con Microsoft: ${res.status} — ${err}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("Microsoft no devolvió access_token");
  return data.access_token as string;
}

// ── Crear carpeta (ignora el 409 si ya existe) ────────────────────────────────
async function crearCarpeta(token: string, user: string, ruta: string): Promise<void> {
  const partes = ruta.split("/").filter(Boolean);

  for (let i = 0; i < partes.length; i++) {
    const parentPath = partes.slice(0, i).join("/");
    const nombre     = partes[i];

    const endpoint = parentPath
      ? `${GRAPH}/users/${encodeURIComponent(user)}/drive/root:/${parentPath}:/children`
      : `${GRAPH}/users/${encodeURIComponent(user)}/drive/root/children`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name:   nombre,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail", // 409 si ya existe → ignorar
      }),
    });
  }
}

// ── Subir archivo (simple upload, max ~4 MB) ──────────────────────────────────
async function subirArchivo(
  token: string,
  user: string,
  rutaCompleta: string,
  contenido: Buffer,
  contentType: string
): Promise<void> {
  const url = `${GRAPH}/users/${encodeURIComponent(user)}/drive/root:/${rutaCompleta}:/content`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: contenido as unknown as BodyInit,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[OneDrive] Error subiendo ${rutaCompleta}: ${res.status} — ${err}`);
  }
}

// ── Punto de entrada público ──────────────────────────────────────────────────
export async function sincronizarAprobadoEnOneDrive(
  personalId: string,
  nombrePersona: string,
  cedula: string,
  empresaNombre: string
): Promise<void> {
  const user = process.env.ONEDRIVE_USER;
  if (!user || !process.env.AZURE_CLIENT_ID) {
    // OneDrive no configurado → omitir silenciosamente
    return;
  }

  const token = await getToken();
  const admin = createAdminClient();

  // Documentos del trabajador
  const { data: documentos, error } = await admin
    .from("documentos_personal")
    .select("id, tipo, url")
    .eq("personal_id", personalId);

  if (error || !documentos || documentos.length === 0) return;

  // Crear estructura de carpetas
  const carpeta = `Contratistas/${safe(empresaNombre)}/${safe(nombrePersona)} - ${safe(cedula)}`;
  await crearCarpeta(token, user, carpeta);

  // Subir cada documento
  for (const doc of documentos) {
    try {
      const { data: blob } = await admin.storage
        .from("documentos")
        .download(doc.url);

      if (!blob) continue;

      const buf = Buffer.from(await blob.arrayBuffer());
      const ext = doc.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "pdf";

      const contentType =
        ext === "pdf"  ? "application/pdf" :
        ext === "png"  ? "image/png"       :
        ext === "webp" ? "image/webp"      : "image/jpeg";

      const nombreBase = TIPO_NOMBRES[doc.tipo] ?? safe(doc.tipo);
      const nombreArchivo = `${nombreBase}.${ext}`;

      await subirArchivo(token, user, `${carpeta}/${nombreArchivo}`, buf, contentType);
    } catch (e) {
      console.error(`[OneDrive] Error con documento ${doc.tipo}:`, e);
    }
  }

  console.log(`[OneDrive] Sincronizado: ${carpeta}`);
}
