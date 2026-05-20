/**
 * Verificación de documentos colombianos — corre en Vercel (Node.js).
 * Usa solo built-ins de Node.js (zlib). Sin npm packages externos.
 * PDFs con texto digital → extracción de streams + regex keywords.
 * PDFs escaneados / imágenes → validación de formato y tamaño (confianza media).
 */

import { inflateSync, inflateRawSync } from "zlib";
import type { TipoDocumento, VerificacionResultado } from "@/types";

// ─── Configuración ────────────────────────────────────────────────────────────
const MIN_BYTES = 1_000;
const MAX_BYTES = 25_000_000;
const MIN_TEXTO_CHARS = 20;

// ─── Labels ───────────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula:                  "Cédula de Ciudadanía",
  licencia:                "Licencia de Conducción",
  arl:                     "Certificado ARL",
  soat:                    "SOAT",
  tecnicomecanica:         "Revisión Tecnomecánica",
  planilla_aportes:        "Planilla de Aportes PILA",
  examenes_medicos:        "Exámenes Médicos Ocupacionales",
  certificados_especialidad: "Certificado de Especialidad",
  arl_sgsst:               "ARL SG-SST",
  responsable_sgsst:       "Responsable SG-SST",
};

// ─── Patrones por tipo de documento ──────────────────────────────────────────
const PATRONES_TIPO: Record<TipoDocumento, RegExp[]> = {
  cedula: [
    /C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A/i,
    /REP[UÚ]BLICA\s+DE\s+COLOMBIA/i,
    /REGISTRADUR[IÍ]A\s+NACIONAL/i,
    /\bNUIP\b/i,
    /TARJETA\s+DE\s+IDENTIDAD/i,
    /IDENTIFICACI[OÓ]N\s+PERSONAL/i,
  ],
  licencia: [
    /LICENCIA\s+DE\s+CONDUCCI[OÓ]N/i,
    /MINISTERIO\s+DE\s+TRANSPORTE/i,
    /REGISTRO\s+NACIONAL\s+(?:DE\s+)?TR[AÁ]NSITO/i,
    /\bRUNT\b/i,
    /LICENCIA\s+(?:N[UÚ]M(?:ERO)?|#|NO\.?)/i,
    /CATEGOR[IÍ]A\s+[ABCDE]\d?\b/i,
  ],
  arl: [
    /ADMINISTRADORA\s+DE\s+RIESGOS\s+LABORALES/i,
    /\bARL\b/,
    /RIESGOS\s+LABORALES/i,
    /AFILIACI[OÓ]N\s+(?:A\s+LA\s+)?ARL/i,
    /POSITIVA|SURA|COLMENA|LIBERTY|COLPATRIA|AXA|ACOMP/i,
    /COBERTURA\s+(?:DE\s+)?RIESGOS/i,
  ],
  soat: [
    /\bSOAT\b/,
    /SEGURO\s+OBLIGATORIO\s+DE\s+ACCIDENTES/i,
    /P[OÓ]LIZA\s+SOAT/i,
    /ACCIDENTES\s+DE\s+TR[AÁ]NSITO/i,
    /SEGURO\s+OBLIGATORIO\s+(?:DE\s+)?TR[AÁ]NSITO/i,
  ],
  tecnicomecanica: [
    /REVISI[OÓ]N\s+T[EÉ]CNO/i,
    /TECNICOMEC[AÁ]NICA/i,
    /\bCDA\b/,
    /CERTIFICADO\s+DE\s+REVISI[OÓ]N\s+T[EÉ]CNICO/i,
    /CENTRO\s+DE\s+DIAGN[OÓ]STICO\s+AUTOMOTOR/i,
  ],
  planilla_aportes: [
    /\bPILA\b/,
    /PLANILLA\s+INTEGRADA\s+DE\s+LIQUIDACI[OÓ]N/i,
    /APORTES\s+A\s+LA\s+SEGURIDAD\s+SOCIAL/i,
    /SEGURIDAD\s+SOCIAL\s+INTEGRAL/i,
    /OPERADOR\s+DE\s+INFORMACI[OÓ]N/i,
    /LIQUIDACI[OÓ]N\s+DE\s+APORTES/i,
  ],
  examenes_medicos: [
    /EXAMEN\s+M[EÉ]DICO/i,
    /MEDICINA\s+OCUPACIONAL/i,
    /PRE[\s-]?OCUPACIONAL/i,
    /CONCEPTO\s+M[EÉ]DICO\s+OCUPACIONAL/i,
    /\bAPTO\b/,
    /M[EÉ]DICO\s+OCUPACIONAL/i,
    /EVALUACI[OÓ]N\s+M[EÉ]DICA\s+OCUPACIONAL/i,
  ],
  certificados_especialidad: [
    /CERTIFICADO\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N|APTITUD|COMPETENCIA)/i,
    /\bSENA\b/,
    /COMPETENCIA\s+LABORAL/i,
    /HORAS\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N)/i,
    /PROGRAMA\s+DE\s+FORMACI[OÓ]N/i,
  ],
  arl_sgsst: [
    /SG[\s-]?SST/i,
    /SISTEMA\s+DE\s+GESTI[OÓ]N\s+DE\s+(?:LA\s+)?SEGURIDAD/i,
    /SEGURIDAD\s+Y\s+SALUD\s+EN\s+EL\s+TRABAJO/i,
    /CALIFICACI[OÓ]N\s+DE\s+(?:EMPRESA|CONTRATISTA|RIESGOS)/i,
    /NIVEL\s+DE\s+CUMPLIMIENTO\s+SG/i,
  ],
  responsable_sgsst: [
    /RESPONSABLE\s+(?:DEL?\s+)?SG[\s-]?SST/i,
    /LICENCIA\s+EN\s+SALUD\s+OCUPACIONAL/i,
    /SALUD\s+OCUPACIONAL/i,
    /SG[\s-]?SST/i,
    /COORDINADOR\s+(?:DE\s+)?(?:SST|SG)/i,
    /PROFESIONAL\s+EN\s+SST/i,
  ],
};

// ─── Meses en español ─────────────────────────────────────────────────────────
const MESES_ES: Record<string, number> = {
  enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,
  julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12,
  ene:1,feb:2,mar:3,abr:4,may:5,jun:6,
  jul:7,ago:8,sep:9,oct:10,nov:11,dic:12,
};

// ─── Punto de entrada ─────────────────────────────────────────────────────────
export async function verificarDocumento(
  fileBuffer: ArrayBuffer,
  url: string,
  tipoEsperado: TipoDocumento
): Promise<VerificacionResultado> {
  const buf = Buffer.from(fileBuffer);
  const n = buf.length;

  if (n < MIN_BYTES) return _error(`Archivo demasiado pequeño (${n} bytes)`);
  if (n > MAX_BYTES) return _error("Archivo excede el tamaño máximo de 25 MB");

  const mime = _detectarMime(url, buf);

  if (mime === "application/pdf") return _verificarPDF(buf, tipoEsperado);
  if (mime.startsWith("image/"))  return _verificarImagen(mime, tipoEsperado);
  return _error(`Formato no soportado (${mime}). Solo PDF e imágenes JPG/PNG/WebP`);
}

// ─── Verificación PDF ─────────────────────────────────────────────────────────
function _verificarPDF(buf: Buffer, tipo: TipoDocumento): VerificacionResultado {
  // Validar cabecera %PDF
  if (!buf.slice(0, 5).toString("ascii").startsWith("%PDF")) {
    return _error("El archivo no es un PDF válido");
  }

  const texto = _extraerTextoPDF(buf);
  const label = TIPO_LABELS[tipo];

  if (texto.length < MIN_TEXTO_CHARS) {
    // PDF escaneado o sin capa de texto legible
    return {
      es_correcto_tipo:            true,
      esta_vigente:                null,
      fecha_vencimiento_detectada: null,
      nombre_detectado:            null,
      observacion: `PDF válido — sin texto extraíble (posiblemente escaneado). Tipo asumido: ${label}. Revisión manual recomendada.`,
      confianza: "media",
    };
  }

  return _analizarTexto(texto, tipo);
}

// ─── Extracción de texto del PDF (sin dependencias externas) ──────────────────
function _extraerTextoPDF(buf: Buffer): string {
  const partes: string[] = [];

  // Convertir a latin-1 para leer el PDF como texto
  const raw = buf.toString("latin1");

  // ── Estrategia 1: streams FlateDecode comprimidos ──
  // Busca los bloques stream...endstream y descomprime con zlib
  const streamRe = /<<([^>]{1,800})>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) !== null) {
    const header = m[1];
    const data   = m[2];

    if (/FlateDecode/i.test(header)) {
      // Descomprimir con zlib (FlateDecode = zlib/deflate)
      try {
        const compressed = Buffer.from(data, "latin1");
        let decompressed: Buffer | null = null;
        try { decompressed = inflateSync(compressed); } catch { /* no zlib header */ }
        if (!decompressed) {
          try { decompressed = inflateRawSync(compressed); } catch { /* not raw deflate */ }
        }
        if (decompressed) {
          partes.push(_textoDeBloquesPDF(decompressed.toString("latin1")));
        }
      } catch { /* skip stream */ }
    } else if (!/Image|XObject|ObjStm/i.test(header)) {
      // Stream no comprimido — extraer directamente
      partes.push(_textoDeBloquesPDF(data));
    }
  }

  // ── Estrategia 2: texto directo en BT/ET sin stream ──
  partes.push(_textoDeBloquesPDF(raw));

  const resultado = partes.join(" ").replace(/\s+/g, " ").trim();
  return _limpiarTextoPDF(resultado);
}

// Extrae cadenas de texto de bloques BT...ET de un segmento PDF
function _textoDeBloquesPDF(contenido: string): string {
  const tokens: string[] = [];

  // Bloques BT (Begin Text) ... ET (End Text)
  const btEt = /BT([\s\S]{1,3000}?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEt.exec(contenido)) !== null) {
    const bloque = m[1];
    // Strings entre paréntesis: (texto aquí)
    const paren = /\(([^)\\]{0,200}(?:\\.[^)\\]{0,200})*)\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = paren.exec(bloque)) !== null) {
      const s = pm[1]
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\\\/g, "\\")
        .replace(/\\[()]/g, "")
        .trim();
      if (s.length > 1) tokens.push(s);
    }
    // Arrays de texto: [(str1)(str2)]
    const arr = /\[((?:[^\[\]]*\([^)]*\))*[^\[\]]*)\]/g;
    let am: RegExpExecArray | null;
    while ((am = arr.exec(bloque)) !== null) {
      const innerParen = /\(([^)\\]{0,200})\)/g;
      let im: RegExpExecArray | null;
      while ((im = innerParen.exec(am[1])) !== null) {
        if (im[1].trim().length > 1) tokens.push(im[1].trim());
      }
    }
  }

  return tokens.join(" ");
}

// Limpia artefactos comunes del texto extraído de PDFs
function _limpiarTextoPDF(texto: string): string {
  return texto
    .replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ\s]/g, " ")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

// ─── Verificación imagen ──────────────────────────────────────────────────────
function _verificarImagen(mime: string, tipo: TipoDocumento): VerificacionResultado {
  const fmt   = mime.split("/")[1]?.toUpperCase() ?? "imagen";
  const label = TIPO_LABELS[tipo];
  return {
    es_correcto_tipo:            true,
    esta_vigente:                null,
    fecha_vencimiento_detectada: null,
    nombre_detectado:            null,
    observacion: `Imagen ${fmt} válida — tipo asumido: ${label}. Verificación manual recomendada.`,
    confianza: "media",
  };
}

// ─── Análisis de texto ────────────────────────────────────────────────────────
function _analizarTexto(texto: string, tipo: TipoDocumento): VerificacionResultado {
  const patrones = PATRONES_TIPO[tipo];
  const label    = TIPO_LABELS[tipo];
  const score    = patrones.filter((p) => p.test(texto)).length;
  const esCorr   = score >= 1;

  const [fechaVenc, estaVigente] = _extraerFechaVencimiento(texto);
  const nombre = _extraerNombre(texto);

  let confianza: "alta" | "media" | "baja" = esCorr
    ? (score >= 2 ? "alta" : "media")
    : "media";

  let obs = esCorr
    ? `Documento identificado como ${label} (${score} coincidencia${score > 1 ? "s" : ""})`
    : `No se identificaron palabras clave de ${label} — verifica manualmente`;

  if (estaVigente === false) {
    obs += " · DOCUMENTO VENCIDO";
    confianza = "baja";
  }

  return {
    es_correcto_tipo:            esCorr,
    esta_vigente:                estaVigente,
    fecha_vencimiento_detectada: fechaVenc,
    nombre_detectado:            nombre,
    observacion:                 obs.slice(0, 200),
    confianza,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _detectarMime(url: string, buf: Buffer): string {
  // Magic bytes primero
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
    return "application/pdf"; // %PDF
  if (buf[0] === 0xff && buf[1] === 0xd8)
    return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (buf.slice(0,4).toString("ascii") === "RIFF" && buf.slice(8,12).toString("ascii") === "WEBP")
    return "image/webp";

  // Fallback por extensión
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf:"application/pdf", jpg:"image/jpeg", jpeg:"image/jpeg",
    png:"image/png", webp:"image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

function _extraerFechaVencimiento(texto: string): [string | null, boolean | null] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const PATRONES: [RegExp, "dmy" | "ymd" | "dmy_es"][] = [
    [/(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|fecha\s+(?:de\s+)?vencimiento|hasta\s+el|fecha\s+fin|f\.?\s*vto)\s*[:\-]?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b/i, "dmy"],
    [/(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|hasta\s+el)\s*[:\-]?\s*(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:del?\s+)?(20\d{2})\b/i, "dmy_es"],
    [/(?:vence?|vencimiento|fecha\s+fin)\s*[:\-]?\s*(20\d{2})[/\-.](\d{2})[/\-.](\d{2})\b/i, "ymd"],
    [/\b(\d{2})[/\-](1[0-2]|0[1-9])\/(20[2-9]\d)\b/, "dmy"],
  ];

  for (const [patron, fmt] of PATRONES) {
    const m = patron.exec(texto);
    if (!m) continue;
    try {
      let d: number, mo: number, y: number;
      if (fmt === "dmy")    { d = +m[1]; mo = +m[2]; y = +m[3]; }
      else if (fmt === "ymd") { y = +m[1]; mo = +m[2]; d = +m[3]; }
      else                  { d = +m[1]; mo = MESES_ES[m[2].toLowerCase()] ?? 0; y = +m[3]; }
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2060) continue;
      const fecha = new Date(y, mo - 1, d);
      if (isNaN(fecha.getTime())) continue;
      return [fecha.toISOString().split("T")[0], fecha >= hoy];
    } catch { continue; }
  }
  return [null, null];
}

function _extraerNombre(texto: string): string | null {
  const patrones = [
    /(?:nombres?\s+y\s+apellidos?|titular|nombre\s+completo)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?=\n|\r|$|\s{2,})/im,
    /(?:certifica\s+que)\s+(?:el\s+señor|la\s+señora)?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?:\s+identificad|\s+con\s+c)/im,
  ];
  for (const p of patrones) {
    const m = p.exec(texto.toUpperCase());
    if (m) {
      const palabras = m[1].trim().split(/\s+/);
      if (palabras.length >= 2 && palabras.length <= 6) {
        return m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }
  return null;
}

function _error(observacion: string): VerificacionResultado {
  return {
    es_correcto_tipo:            false,
    esta_vigente:                null,
    fecha_vencimiento_detectada: null,
    nombre_detectado:            null,
    observacion:                 observacion.slice(0, 200),
    confianza:                   "baja",
  };
}
