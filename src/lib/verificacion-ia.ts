/**
 * Verificación de documentos colombianos — corre en Vercel (Node.js).
 * Usa solo built-ins de Node.js (zlib). Sin npm packages externos.
 * PDFs con texto digital → extracción de streams + regex keywords.
 * PDFs escaneados / imágenes → confianza media, requieren revisión manual.
 */

import { inflateSync, inflateRawSync } from "zlib";
import type { TipoDocumento, VerificacionResultado } from "@/types";

// ─── Configuración ────────────────────────────────────────────────────────────
const MIN_BYTES = 1_000;
const MAX_BYTES = 25_000_000;
const MIN_TEXTO_CHARS = 20;

// Umbral de score para considerar el documento correcto:
// score >= SCORE_MIN_CORRECTO → es_correcto_tipo = true
// score < SCORE_MIN_CORRECTO pero score > 0 → dudoso (media, sin auto-verificar)
const SCORE_MIN_CORRECTO = 2;
// Score mínimo para confianza "alta"
const SCORE_ALTA = 4;

// ─── Labels ───────────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<TipoDocumento, string> = {
  cedula:                    "Cédula de Ciudadanía",
  licencia:                  "Licencia de Conducción",
  arl:                       "Certificado ARL",
  soat:                      "SOAT",
  tecnicomecanica:           "Revisión Tecnomecánica",
  planilla_aportes:          "Planilla de Aportes PILA",
  examenes_medicos:          "Exámenes Médicos Ocupacionales",
  certificados_especialidad: "Certificado de Especialidad",
  arl_sgsst:                 "ARL SG-SST",
  responsable_sgsst:         "Responsable SG-SST",
};

// ─── Patrones por tipo de documento (contenido PDF) ──────────────────────────
const PATRONES_TIPO: Record<TipoDocumento, RegExp[]> = {
  cedula: [
    /C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A/i,
    /REP[UÚ]BLICA\s+DE\s+COLOMBIA/i,
    /REGISTRADUR[IÍ]A\s+NACIONAL/i,
    /\bNUIP\b/i,
    /TARJETA\s+DE\s+IDENTIDAD/i,
    /IDENTIFICACI[OÓ]N\s+PERSONAL/i,
    /ESTADO\s+CIVIL\b/i,
    /DOCUMENTO\s+DE\s+IDENTIDAD/i,
    /\bC\.C\.\b/i,
    /LUGAR\s+DE\s+EXPEDICI[OÓ]N/i,
    /FECHA\s+DE\s+NACIMIENTO/i,
  ],
  licencia: [
    /LICENCIA\s+DE\s+CONDUCCI[OÓ]N/i,
    /MINISTERIO\s+DE\s+TRANSPORTE/i,
    /REGISTRO\s+NACIONAL\s+(?:DE\s+)?TR[AÁ]NSITO/i,
    /\bRUNT\b/i,
    /LICENCIA\s+(?:N[UÚ]M(?:ERO)?|#|NO\.?)/i,
    /CATEGOR[IÍ]A\s+[ABCDE]\d?\b/i,
    /PERMISO\s+DE\s+CONDUCCI[OÓ]N/i,
    /RESTRICCI[OÓ]N\s+(?:DE\s+)?CONDUCTOR/i,
    /PUNTOS\s+(?:ACUMULADOS|VIGENTES)/i,
    /AUTOMOTOR\b/i,
    /FONDO\s+DE\s+PREVENCI[OÓ]N/i,
    /LICENCIA.*(?:VENCE|VIGENCIA)/i,
  ],
  arl: [
    /ADMINISTRADORA\s+DE\s+RIESGOS\s+LABORALES/i,
    /\bARL\b/,
    /RIESGOS\s+LABORALES/i,
    /AFILIACI[OÓ]N\s+(?:A\s+LA\s+)?ARL/i,
    /POSITIVA|SURA\s+ARL|COLMENA|LIBERTY\s+SEGUROS|COLPATRIA|AXA\s+COLPATRIA/i,
    /COBERTURA\s+(?:DE\s+)?RIESGOS/i,
    /CERTIFICADO\s+DE\s+AFILIACI[OÓ]N/i,
    /CLASE\s+DE\s+RIESGO/i,
    /NIVEL\s+DE\s+RIESGO/i,
    /ACTIVIDAD\s+ECON[OÓ]MICA/i,
    /CENTRO\s+DE\s+TRABAJO/i,
    /TASA\s+DE\s+COTIZACI[OÓ]N/i,
  ],
  soat: [
    /\bSOAT\b/,
    /SEGURO\s+OBLIGATORIO\s+DE\s+ACCIDENTES/i,
    /P[OÓ]LIZA\s+SOAT/i,
    /ACCIDENTES\s+DE\s+TR[AÁ]NSITO/i,
    /SEGURO\s+OBLIGATORIO\s+(?:DE\s+)?TR[AÁ]NSITO/i,
    /FASECOLDA/i,
    /P[OÓ]LIZA\s+N[UÚ]M(?:ERO)?/i,
    /TOMADOR\s+(?:DEL?\s+)?SEGURO/i,
    /PRIMA\s+(?:NETA|TOTAL)/i,
    /PLACA\s+DEL?\s+VEH[IÍ]CULO/i,
    /VIGENCIA\s+(?:DEL?\s+)?SEGURO/i,
  ],
  tecnicomecanica: [
    /REVISI[OÓ]N\s+T[EÉ]CNO/i,
    /TECNICOMEC[AÁ]NICA/i,
    /\bCDA\b/,
    /CERTIFICADO\s+DE\s+REVISI[OÓ]N\s+T[EÉ]CNICO/i,
    /CENTRO\s+DE\s+DIAGN[OÓ]STICO\s+AUTOMOTOR/i,
    /EMISIONES\s+CONTAMINANTES/i,
    /REVISI[OÓ]N\s+PERI[OÓ]DICA/i,
    /SISTEMA\s+DE\s+FRENOS/i,
    /INSPECCI[OÓ]N\s+T[EÉ]CNICA/i,
    /VIGENCIA\s+(?:DE\s+LA\s+)?REVISI[OÓ]N/i,
    /APTITUD\s+(?:DEL?\s+)?VEH[IÍ]CULO/i,
  ],
  planilla_aportes: [
    /\bPILA\b/,
    /PLANILLA\s+INTEGRADA\s+DE\s+LIQUIDACI[OÓ]N/i,
    /APORTES\s+A\s+LA\s+SEGURIDAD\s+SOCIAL/i,
    /SEGURIDAD\s+SOCIAL\s+INTEGRAL/i,
    /OPERADOR\s+DE\s+INFORMACI[OÓ]N/i,
    /LIQUIDACI[OÓ]N\s+DE\s+APORTES/i,
    /TIPO\s+DE\s+COTIZANTE/i,
    /BASE\s+DE\s+COTIZACI[OÓ]N/i,
    /INGRESO\s+BASE\s+DE\s+COTIZACI[OÓ]N/i,
    /SALUD.*PENSI[OÓ]N.*RIESGOS/i,
    /PAGO\s+DE\s+SEGURIDAD\s+SOCIAL/i,
    /COLPENSIONES|COLFONDOS|PORVENIR|SKANDIA/i,
    /PERIODO\s+(?:DE\s+)?COTIZACI[OÓ]N/i,
  ],
  examenes_medicos: [
    /EXAMEN\s+M[EÉ]DICO/i,
    /MEDICINA\s+OCUPACIONAL/i,
    /PRE[\s-]?OCUPACIONAL/i,
    /CONCEPTO\s+M[EÉ]DICO\s+OCUPACIONAL/i,
    /\bAPTO\b/,
    /M[EÉ]DICO\s+OCUPACIONAL/i,
    /EVALUACI[OÓ]N\s+M[EÉ]DICA\s+OCUPACIONAL/i,
    /APTO\s+PARA\s+(?:EL\s+)?TRABAJO/i,
    /RESTRICCI[OÓ]N\s+M[EÉ]DICA/i,
    /HISTORIA\s+CL[IÍ]NICA\s+OCUPACIONAL/i,
    /CARGO\s+(?:AL\s+QUE\s+)?ASPIRA/i,
    /APTITUD\s+F[IÍ]SICA/i,
    /RIESGO\s+CARDIOVASCULAR/i,
    /VISI[OÓ]N.*O[IÍ]DO/i,
  ],
  certificados_especialidad: [
    /CERTIFICADO\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N|APTITUD|COMPETENCIA)/i,
    /\bSENA\b/,
    /COMPETENCIA\s+LABORAL/i,
    /HORAS\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N)/i,
    /PROGRAMA\s+DE\s+FORMACI[OÓ]N/i,
    /TRABAJO\s+EN\s+ALTURAS/i,
    /MANEJO\s+(?:DE\s+)?MATERIALES\s+PELIGROSOS/i,
    /PRIMEROS\s+AUXILIOS/i,
    /ESPACIOS\s+CONFINADOS/i,
    /IZAJE\s+(?:DE\s+)?CARGAS/i,
    /OPERACI[OÓ]N\s+(?:DE\s+)?(?:MONTACARGA|GRÚA|EXCAVADORA)/i,
    /ANDAMIOS/i,
    /CERTIFICADO.*(?:CURSO|ENTRENAMIENTO)/i,
  ],
  arl_sgsst: [
    /SG[\s-]?SST/i,
    /SISTEMA\s+DE\s+GESTI[OÓ]N\s+DE\s+(?:LA\s+)?SEGURIDAD/i,
    /SEGURIDAD\s+Y\s+SALUD\s+EN\s+EL\s+TRABAJO/i,
    /CALIFICACI[OÓ]N\s+DE\s+(?:EMPRESA|CONTRATISTA|RIESGOS)/i,
    /NIVEL\s+DE\s+CUMPLIMIENTO\s+SG/i,
    /PORCENTAJE\s+DE\s+CUMPLIMIENTO/i,
    /EST[AÁ]NDAR\s+M[IÍ]NIMO/i,
    /RESOLUCI[OÓ]N\s+0312/i,
    /INSPECCI[OÓ]N.*SST/i,
    /PLAN\s+DE\s+(?:TRABAJO|MEJORAMIENTO)\s+SG/i,
  ],
  responsable_sgsst: [
    /RESPONSABLE\s+(?:DEL?\s+)?SG[\s-]?SST/i,
    /LICENCIA\s+EN\s+SALUD\s+OCUPACIONAL/i,
    /SALUD\s+OCUPACIONAL/i,
    /SG[\s-]?SST/i,
    /COORDINADOR\s+(?:DE\s+)?(?:SST|SG)/i,
    /PROFESIONAL\s+EN\s+SST/i,
    /50\s+HORAS|CURSO.*(?:SST|SGSST)/i,
    /VIG[IÍ]A\s+(?:DE\s+)?SEGURIDAD/i,
    /CERTIFICACI[OÓ]N.*RESPONSABLE/i,
    /DIPLOMADO.*SST/i,
    /ASESOR.*SGSST/i,
  ],
};

// ─── Palabras clave en el nombre del archivo ──────────────────────────────────
const FILENAME_PATRONES: Record<TipoDocumento, RegExp> = {
  cedula:                    /ced[uú]la|c\.?c\.?(?!\d)|identidad|ciudadan[aí]/i,
  licencia:                  /licen[cs]|conducci|runt|driver|pase\b/i,
  arl:                       /\barl\b|afiliaci|riesgo.*labor/i,
  soat:                      /\bsoat\b|seguro.*trans|poliza.*trans/i,
  tecnicomecanica:           /tecno|tecnomec|revisi[oó]n.*veh|cda\b/i,
  planilla_aportes:          /\bpila\b|planilla|aportes?|seg.*social/i,
  examenes_medicos:          /examen|m[eé]dic|ocupacional|preocupacional/i,
  certificados_especialidad: /certific|sena|formaci|capacitaci|especialidad|competencia/i,
  arl_sgsst:                 /sgsst|sg.?sst|calificaci.*sst/i,
  responsable_sgsst:         /responsable|vigía|coordinador.*sst|licencia.*salud/i,
};

// ─── Patrones que indican fuertemente que es OTRO documento (penalizan) ───────
const PATRONES_WRONG: Partial<Record<TipoDocumento, RegExp[]>> = {
  cedula: [
    /\bSOAT\b/,
    /LICENCIA\s+DE\s+CONDUCCI[OÓ]N/i,
    /PLANILLA\s+INTEGRADA/i,
    /TECNICOMEC[AÁ]NICA/i,
  ],
  licencia: [
    /\bSOAT\b/,
    /PLANILLA\s+INTEGRADA/i,
    /TECNICOMEC[AÁ]NICA/i,
  ],
  soat: [
    /C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A/i,
    /LICENCIA\s+DE\s+CONDUCCI[OÓ]N/i,
    /TECNICOMEC[AÁ]NICA/i,
    /PLANILLA\s+INTEGRADA/i,
  ],
  tecnicomecanica: [
    /\bSOAT\b/,
    /C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A/i,
    /PLANILLA\s+INTEGRADA/i,
  ],
  planilla_aportes: [
    /\bSOAT\b/,
    /C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A/i,
    /LICENCIA\s+DE\s+CONDUCCI[OÓ]N/i,
    /TECNICOMEC[AÁ]NICA/i,
  ],
};

// ─── Máximos días desde la emisión por tipo de documento ─────────────────────
// null = solo se verifica la fecha de vencimiento (no la de emisión)
const RANGO_MAX_DIAS_EMISION: Partial<Record<TipoDocumento, number>> = {
  arl:              30,   // certificado mensual de afiliación
  planilla_aportes: 45,   // PILA del mes anterior (con gracia)
  examenes_medicos: 365,  // validez anual
  arl_sgsst:        365,  // calificación anual
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
  tipoEsperado: TipoDocumento,
  nombreArchivo?: string | null
): Promise<VerificacionResultado> {
  const buf = Buffer.from(fileBuffer);
  const n = buf.length;

  if (n < MIN_BYTES) return _error(`Archivo demasiado pequeño (${n} bytes)`);
  if (n > MAX_BYTES) return _error("Archivo excede el tamaño máximo de 25 MB");

  const mime = _detectarMime(url, buf);

  if (mime === "application/pdf") return _verificarPDF(buf, tipoEsperado, url, nombreArchivo);
  if (mime.startsWith("image/"))  return _verificarImagen(mime, tipoEsperado, url, nombreArchivo);
  return _error(`Formato no soportado (${mime}). Solo PDF e imágenes JPG/PNG/WebP`);
}

// ─── Analiza nombre de archivo ────────────────────────────────────────────────
function _scoreNombre(url: string, nombreArchivo: string | null | undefined, tipo: TipoDocumento): number {
  const candidatos = [
    nombreArchivo ?? "",
    url.split("?")[0].split("/").pop() ?? "",
  ].map((s) => s.replace(/[_\-\.]/g, " ").toLowerCase());

  const patron = FILENAME_PATRONES[tipo];
  return candidatos.some((c) => patron.test(c)) ? 1 : 0;
}

// ─── Verificación PDF ─────────────────────────────────────────────────────────
function _verificarPDF(
  buf: Buffer, tipo: TipoDocumento,
  url: string, nombreArchivo?: string | null
): VerificacionResultado {
  if (!buf.slice(0, 5).toString("ascii").startsWith("%PDF")) {
    return _error("El archivo no es un PDF válido");
  }

  const texto = _extraerTextoPDF(buf);
  const label = TIPO_LABELS[tipo];

  if (texto.length < MIN_TEXTO_CHARS) {
    // PDF escaneado — no se puede verificar el tipo automáticamente
    const scoreNombre = _scoreNombre(url, nombreArchivo, tipo);
    return {
      es_correcto_tipo:            false,
      esta_vigente:                null,
      fecha_vencimiento_detectada: null,
      nombre_detectado:            null,
      observacion: scoreNombre > 0
        ? `PDF escaneado (sin texto). El nombre del archivo sugiere ${label}. Revisión manual obligatoria.`
        : `PDF escaneado (sin texto extraíble). Tipo esperado: ${label}. Revisión manual obligatoria.`,
      confianza: "media",
      fuera_de_rango: false,
    };
  }

  return _analizarTexto(texto, tipo, url, nombreArchivo);
}

// ─── Extracción de texto del PDF (sin dependencias externas) ──────────────────
function _extraerTextoPDF(buf: Buffer): string {
  const partes: string[] = [];
  const raw = buf.toString("latin1");

  const streamRe = /<<([^>]{1,800})>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw)) !== null) {
    const header = m[1];
    const data   = m[2];

    if (/FlateDecode/i.test(header)) {
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
      partes.push(_textoDeBloquesPDF(data));
    }
  }

  partes.push(_textoDeBloquesPDF(raw));

  const resultado = partes.join(" ").replace(/\s+/g, " ").trim();
  return _limpiarTextoPDF(resultado);
}

function _textoDeBloquesPDF(contenido: string): string {
  const tokens: string[] = [];

  const btEt = /BT([\s\S]{1,3000}?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = btEt.exec(contenido)) !== null) {
    const bloque = m[1];
    const paren = /\(([^)\\]{0,200}(?:\\.[^)\\]{0,200})*)\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = paren.exec(bloque)) !== null) {
      const s = pm[1]
        .replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ")
        .replace(/\\\\/g, "\\").replace(/\\[()]/g, "").trim();
      if (s.length > 1) tokens.push(s);
    }
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

function _limpiarTextoPDF(texto: string): string {
  return texto
    .replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ\s]/g, " ")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

// ─── Verificación imagen ──────────────────────────────────────────────────────
function _verificarImagen(
  mime: string, tipo: TipoDocumento,
  url: string, nombreArchivo?: string | null
): VerificacionResultado {
  const fmt   = mime.split("/")[1]?.toUpperCase() ?? "imagen";
  const label = TIPO_LABELS[tipo];
  const scoreNombre = _scoreNombre(url, nombreArchivo, tipo);
  return {
    es_correcto_tipo:            false,
    esta_vigente:                null,
    fecha_vencimiento_detectada: null,
    nombre_detectado:            null,
    observacion: scoreNombre > 0
      ? `Imagen ${fmt} — el nombre del archivo sugiere ${label}. Verificación manual recomendada.`
      : `Imagen ${fmt} — tipo esperado: ${label}. Verificación manual recomendada.`,
    confianza: "media",
    fuera_de_rango: false,
  };
}

// ─── Análisis de texto ────────────────────────────────────────────────────────
function _analizarTexto(
  texto: string, tipo: TipoDocumento,
  url: string, nombreArchivo?: string | null
): VerificacionResultado {
  const patrones = PATRONES_TIPO[tipo];
  const label    = TIPO_LABELS[tipo];

  // Score de contenido
  const scoreContenido = patrones.filter((p) => p.test(texto)).length;

  // Score de nombre de archivo (vale como 1 punto de contenido adicional)
  const scoreNombre = _scoreNombre(url, nombreArchivo, tipo);

  // Penalización: si hay patrones de otro tipo muy específicos
  const wrongPatrones = PATRONES_WRONG[tipo] ?? [];
  const wrongHits = wrongPatrones.filter((p) => p.test(texto)).length;
  const penalizacion = wrongHits >= 2 ? 2 : wrongHits;

  const scoreTotal = Math.max(0, scoreContenido + scoreNombre - penalizacion);

  const [fechaVenc, estaVigente] = _extraerFechaVencimiento(texto);
  const fechaEmision = _extraerFechaEmision(texto);
  const nombre = _extraerNombre(texto);

  // Calcular si el documento está fuera del rango permitido
  let fueraDeRango = false;
  if (estaVigente === false) {
    fueraDeRango = true;
  } else {
    const maxDias = RANGO_MAX_DIAS_EMISION[tipo];
    if (fechaEmision && maxDias !== undefined) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const diasDesdeEmision = Math.floor((hoy.getTime() - new Date(fechaEmision).getTime()) / 86400000);
      if (diasDesdeEmision > maxDias) fueraDeRango = true;
    }
  }

  // Determinar si es correcto el tipo
  const esCorr = scoreTotal >= SCORE_MIN_CORRECTO;

  let confianza: "alta" | "media" | "baja";
  if (esCorr) {
    confianza = scoreTotal >= SCORE_ALTA ? "alta" : "media";
  } else {
    confianza = scoreContenido === 0 && scoreNombre === 0 ? "baja" : "media";
  }

  let obs: string;
  if (esCorr) {
    obs = `Documento identificado como ${label} (${scoreContenido} coincidencia${scoreContenido !== 1 ? "s" : ""} en contenido${scoreNombre > 0 ? " + nombre de archivo" : ""})`;
  } else if (scoreContenido > 0 || scoreNombre > 0) {
    obs = `Coincidencias insuficientes para ${label} (${scoreContenido} en contenido${scoreNombre > 0 ? " + nombre" : ""}${wrongHits > 0 ? `, ${wrongHits} indicador(es) de otro tipo` : ""}) — verifica manualmente`;
  } else {
    obs = `No se encontraron palabras clave de ${label}${wrongHits > 0 ? " y se detectaron indicadores de otro tipo de documento" : ""} — verifica manualmente`;
  }

  if (fueraDeRango) {
    obs += estaVigente === false ? " · DOCUMENTO VENCIDO" : " · FUERA DEL RANGO PERMITIDO";
    confianza = "baja";
  }

  return {
    es_correcto_tipo:            esCorr,
    esta_vigente:                estaVigente,
    fecha_vencimiento_detectada: fechaVenc,
    nombre_detectado:            nombre,
    observacion:                 obs.slice(0, 250),
    confianza,
    fuera_de_rango:              fueraDeRango,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _detectarMime(url: string, buf: Buffer): string {
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
    return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8)
    return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (buf.slice(0,4).toString("ascii") === "RIFF" && buf.slice(8,12).toString("ascii") === "WEBP")
    return "image/webp";

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

function _extraerFechaEmision(texto: string): string | null {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const PATRONES: [RegExp, "dmy" | "ym"][] = [
    [/(?:fecha\s+(?:de\s+)?expedici[oó]n|fecha\s+(?:de\s+)?emisi[oó]n|expedido\s+el?|emitido\s+el?|elaborado\s+el?|fecha\s+(?:de\s+)?elaboraci[oó]n)\s*[:\-]?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d{2})\b/i, "dmy"],
    [/\bperiodo\s*[:\-]?\s*(0?[1-9]|1[0-2])[/\-](20\d{2})\b/i, "ym"],
    [/\bmes\s*(?:de\s+cotizaci[oó]n|de\s+liquidaci[oó]n)?\s*[:\-]?\s*(0?[1-9]|1[0-2])[/\-](20\d{2})\b/i, "ym"],
  ];

  for (const [patron, fmt] of PATRONES) {
    const m = patron.exec(texto);
    if (!m) continue;
    try {
      let d: number, mo: number, y: number;
      if (fmt === "dmy") { d = +m[1]; mo = +m[2]; y = +m[3]; }
      else               { mo = +m[1]; y = +m[2]; d = 1; }
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2060) continue;
      const fecha = new Date(y, mo - 1, d);
      if (isNaN(fecha.getTime()) || fecha > hoy) continue;
      return fecha.toISOString().split("T")[0];
    } catch { continue; }
  }
  return null;
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
    observacion:                 observacion.slice(0, 250),
    confianza:                   "baja",
    fuera_de_rango:              false,
  };
}
