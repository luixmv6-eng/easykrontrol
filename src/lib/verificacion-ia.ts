/**
 * Verificación de documentos colombianos — corre en Vercel (Node.js).
 * PDFs con texto nativo → pdf-parse + regex de keywords.
 * PDFs escaneados / imágenes → validación de formato y tamaño.
 * Sin servicios externos, sin IA.
 */

import type { TipoDocumento, VerificacionResultado } from "@/types";

// ─── Configuración ────────────────────────────────────────────────────────────
const MIN_BYTES = 3_000;
const MAX_BYTES = 25_000_000;
const MIN_TEXTO_CHARS = 15;

// ─── Labels ───────────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cédula de Ciudadanía",
  licencia: "Licencia de Conducción",
  arl: "Certificado ARL",
  soat: "SOAT",
  tecnicomecanica: "Revisión Tecnomecánica",
  planilla_aportes: "Planilla de Aportes PILA",
  examenes_medicos: "Exámenes Médicos Ocupacionales",
  certificados_especialidad: "Certificado de Especialidad",
  arl_sgsst: "ARL SG-SST",
  responsable_sgsst: "Responsable SG-SST",
};

// ─── Patrones por tipo de documento ──────────────────────────────────────────
const PATRONES_TIPO: Record<TipoDocumento, { patrones: RegExp[]; minScore: number }> = {
  cedula: {
    patrones: [
      /C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A/i,
      /REP[UÚ]BLICA\s+DE\s+COLOMBIA/i,
      /REGISTRADUR[IÍ]A\s+NACIONAL/i,
      /\bNUIP\b/i,
      /TARJETA\s+DE\s+IDENTIDAD/i,
      /IDENTIFICACI[OÓ]N\s+PERSONAL/i,
    ],
    minScore: 1,
  },
  licencia: {
    patrones: [
      /LICENCIA\s+DE\s+CONDUCCI[OÓ]N/i,
      /MINISTERIO\s+DE\s+TRANSPORTE/i,
      /REGISTRO\s+NACIONAL\s+(?:DE\s+)?TR[AÁ]NSITO/i,
      /\bRUNT\b/i,
      /LICENCIA\s+(?:N[UÚ]M(?:ERO)?|#|NO\.?)/i,
      /CATEGOR[IÍ]A\s+[ABCDE]\d?\b/i,
    ],
    minScore: 1,
  },
  arl: {
    patrones: [
      /ADMINISTRADORA\s+DE\s+RIESGOS\s+LABORALES/i,
      /\bARL\b/,
      /RIESGOS\s+LABORALES/i,
      /AFILIACI[OÓ]N\s+(?:A\s+LA\s+)?ARL/i,
      /POSITIVA|SURA|COLMENA|LIBERTY|COLPATRIA|AXA|ACOMP/i,
      /COBERTURA\s+(?:DE\s+)?RIESGOS/i,
    ],
    minScore: 1,
  },
  soat: {
    patrones: [
      /\bSOAT\b/,
      /SEGURO\s+OBLIGATORIO\s+DE\s+ACCIDENTES/i,
      /P[OÓ]LIZA\s+SOAT/i,
      /ACCIDENTES\s+DE\s+TR[AÁ]NSITO/i,
      /SEGURO\s+OBLIGATORIO\s+(?:DE\s+)?TR[AÁ]NSITO/i,
    ],
    minScore: 1,
  },
  tecnicomecanica: {
    patrones: [
      /REVISI[OÓ]N\s+T[EÉ]CNO/i,
      /TECNICOMEC[AÁ]NICA/i,
      /\bCDA\b/,
      /CERTIFICADO\s+DE\s+REVISI[OÓ]N\s+T[EÉ]CNICO/i,
      /CENTRO\s+DE\s+DIAGN[OÓ]STICO\s+AUTOMOTOR/i,
    ],
    minScore: 1,
  },
  planilla_aportes: {
    patrones: [
      /\bPILA\b/,
      /PLANILLA\s+INTEGRADA\s+DE\s+LIQUIDACI[OÓ]N/i,
      /APORTES\s+A\s+LA\s+SEGURIDAD\s+SOCIAL/i,
      /SEGURIDAD\s+SOCIAL\s+INTEGRAL/i,
      /OPERADOR\s+DE\s+INFORMACI[OÓ]N/i,
      /LIQUIDACI[OÓ]N\s+DE\s+APORTES/i,
    ],
    minScore: 1,
  },
  examenes_medicos: {
    patrones: [
      /EXAMEN\s+M[EÉ]DICO/i,
      /MEDICINA\s+OCUPACIONAL/i,
      /PRE[\s-]?OCUPACIONAL/i,
      /CONCEPTO\s+M[EÉ]DICO\s+OCUPACIONAL/i,
      /\bAPTO\b/,
      /M[EÉ]DICO\s+OCUPACIONAL/i,
      /EVALUACI[OÓ]N\s+M[EÉ]DICA\s+OCUPACIONAL/i,
    ],
    minScore: 1,
  },
  certificados_especialidad: {
    patrones: [
      /CERTIFICADO\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N|APTITUD|COMPETENCIA)/i,
      /\bSENA\b/,
      /COMPETENCIA\s+LABORAL/i,
      /HORAS\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N)/i,
      /PROGRAMA\s+DE\s+FORMACI[OÓ]N/i,
    ],
    minScore: 1,
  },
  arl_sgsst: {
    patrones: [
      /SG[\s-]?SST/i,
      /SISTEMA\s+DE\s+GESTI[OÓ]N\s+DE\s+(?:LA\s+)?SEGURIDAD/i,
      /SEGURIDAD\s+Y\s+SALUD\s+EN\s+EL\s+TRABAJO/i,
      /CALIFICACI[OÓ]N\s+DE\s+(?:EMPRESA|CONTRATISTA|RIESGOS)/i,
      /NIVEL\s+DE\s+CUMPLIMIENTO\s+SG/i,
    ],
    minScore: 1,
  },
  responsable_sgsst: {
    patrones: [
      /RESPONSABLE\s+(?:DEL?\s+)?SG[\s-]?SST/i,
      /LICENCIA\s+EN\s+SALUD\s+OCUPACIONAL/i,
      /SALUD\s+OCUPACIONAL/i,
      /SG[\s-]?SST/i,
      /COORDINADOR\s+(?:DE\s+)?(?:SST|SG)/i,
      /PROFESIONAL\s+EN\s+SST/i,
    ],
    minScore: 1,
  },
};

// ─── Meses en español ─────────────────────────────────────────────────────────
const MESES_ES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

// ─── Patrones de fecha de vencimiento ─────────────────────────────────────────
type FmtFecha = "dmy" | "ymd" | "dmy_es";
const PATRONES_FECHA: [RegExp, FmtFecha][] = [
  [
    /(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|fecha\s+(?:de\s+)?vencimiento|hasta\s+el|fecha\s+fin|f\.?\s*vto)\s*[:\-]?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b/i,
    "dmy",
  ],
  [
    /(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|hasta\s+el|fecha\s+fin)\s*[:\-]?\s*(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:del?\s+)?(20\d{2})\b/i,
    "dmy_es",
  ],
  [
    /(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|fecha\s+fin)\s*[:\-]?\s*(20\d{2})[/\-.](\d{2})[/\-.](\d{2})\b/i,
    "ymd",
  ],
  [/\b(\d{2})[/\-](1[0-2]|0[1-9])\/(20[2-9]\d)\b/, "dmy"],
];

// ─── Punto de entrada ─────────────────────────────────────────────────────────
export async function verificarDocumento(
  fileBuffer: ArrayBuffer,
  url: string,
  tipoEsperado: TipoDocumento
): Promise<VerificacionResultado> {
  const buf = Buffer.from(fileBuffer);
  const n = buf.length;

  if (n < MIN_BYTES) return _error(`Archivo demasiado pequeño (${n.toLocaleString()} bytes) — posiblemente vacío`);
  if (n > MAX_BYTES) return _error("Archivo excede el tamaño máximo de 25 MB");

  const mime = _detectarMime(url, buf);

  if (mime === "application/pdf") return _verificarPDF(buf, tipoEsperado);
  if (mime.startsWith("image/"))  return _verificarImagen(buf, mime, tipoEsperado);
  return _error(`Formato no soportado (${mime}). Solo PDF e imágenes JPG/PNG/WebP`);
}

// ─── Verificación PDF ─────────────────────────────────────────────────────────
async function _verificarPDF(buf: Buffer, tipo: TipoDocumento): Promise<VerificacionResultado> {
  let texto = "";
  let numpages = 0;

  try {
    // pdf-parse puede fallar en algunos PDFs; lo manejamos silenciosamente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("pdf-parse") as any;
    const pdfParse = (mod.default ?? mod) as (
      b: Buffer,
      opts?: object
    ) => Promise<{ text: string; numpages: number }>;

    const data = await pdfParse(buf, { max: 5 }); // máximo 5 páginas
    texto    = data.text ?? "";
    numpages = data.numpages ?? 0;
  } catch {
    return _error("PDF inválido, protegido con contraseña o corrupto");
  }

  if (numpages === 0) return _error("El PDF no contiene páginas");

  const textoLimpio = texto.trim();

  if (textoLimpio.length < MIN_TEXTO_CHARS) {
    // PDF escaneado (solo imágenes adentro, sin capa de texto)
    const label = TIPO_LABELS[tipo];
    return {
      es_correcto_tipo: true,
      esta_vigente:             null,
      fecha_vencimiento_detectada: null,
      nombre_detectado:         null,
      observacion: `PDF escaneado válido (${numpages} pág.) — tipo asumido: ${label}. Revisión manual recomendada.`,
      confianza: "media",
    };
  }

  return _analizarTexto(textoLimpio, tipo, `PDF (${numpages} pág.)`);
}

// ─── Verificación imagen ──────────────────────────────────────────────────────
async function _verificarImagen(buf: Buffer, mime: string, tipo: TipoDocumento): Promise<VerificacionResultado> {
  // Validación por magic bytes y tamaño (no necesita librería de imágenes)
  if (buf.length < MIN_BYTES) return _error("Imagen demasiado pequeña — posiblemente vacía");

  const fmt   = mime.split("/")[1]?.toUpperCase() ?? "imagen";
  const label = TIPO_LABELS[tipo];

  return {
    es_correcto_tipo: true,
    esta_vigente:             null,
    fecha_vencimiento_detectada: null,
    nombre_detectado:         null,
    observacion: `Imagen ${fmt} válida — tipo asumido: ${label}. El contenido no puede leerse sin OCR.`,
    confianza: "media",
  };
}

// ─── Análisis de texto ────────────────────────────────────────────────────────
function _analizarTexto(texto: string, tipo: TipoDocumento, fuente: string): VerificacionResultado {
  const info      = PATRONES_TIPO[tipo];
  const label     = TIPO_LABELS[tipo];
  const score     = info.patrones.filter((p) => p.test(texto)).length;
  const esCorr    = score >= info.minScore;

  const [fechaVenc, estaVigente] = _extraerFechaVencimiento(texto);
  const nombre = _extraerNombre(texto);

  let confianza: "alta" | "media" | "baja" = esCorr ? (score >= 2 ? "alta" : "media") : "media";
  let obs = esCorr
    ? `Documento identificado como ${label} · ${fuente}`
    : `Contenido no coincide con el tipo esperado (${label}) · ${fuente}`;

  if (estaVigente === false) {
    obs += " · DOCUMENTO VENCIDO";
    confianza = "baja";
  }

  return {
    es_correcto_tipo:            esCorr,
    esta_vigente:                estaVigente,
    fecha_vencimiento_detectada: fechaVenc,
    nombre_detectado:            nombre,
    observacion:                 obs.slice(0, 150),
    confianza,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _detectarMime(url: string, buf: Buffer): string {
  if (buf.slice(0, 4).toString() === "%PDF") return "application/pdf";
  if (buf[0] === 0x89 && buf[1] === 0x50)  return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8)  return "image/jpeg";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "image/webp";
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  return ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[ext] ?? "application/octet-stream");
}

function _extraerFechaVencimiento(texto: string): [string | null, boolean | null] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (const [patron, fmt] of PATRONES_FECHA) {
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
    observacion:                 observacion.slice(0, 150),
    confianza:                   "baja",
  };
}
