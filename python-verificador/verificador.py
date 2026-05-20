"""
Verificación robusta de documentos colombianos.
PDF digitales  → PyMuPDF (texto nativo).
PDFs escaneados + fotos → Tesseract OCR multi-estrategia (español).
Sin dependencias de IA — 100% local y determinístico.
"""

import io
import re
import base64
from datetime import date
from typing import Optional

import fitz  # PyMuPDF
from PIL import Image, ImageStat, ImageFilter, ImageEnhance
import pytesseract

# ─── Tesseract ────────────────────────────────────────────────────────────────
TESSERACT_LANG   = "spa+eng"
TESSERACT_CONFIG = "--oem 3 --psm 6"     # LSTM engine, bloque de texto uniforme
TESSERACT_CONFIG_SPARSE = "--oem 3 --psm 11"  # texto disperso (fotos de documentos físicos)

# ─── Umbrales ─────────────────────────────────────────────────────────────────
MIN_BYTES       = 3_000
MAX_BYTES       = 25_000_000
MIN_STDDEV      = 4.0         # imagen "en blanco" si desv. estándar < 4
MIN_DIM_PX      = 80
OCR_MIN_CHARS   = 15          # resultado OCR mínimo para considerar legible
MAX_PAGINAS     = 5           # máximo de páginas que procesamos por PDF
RENDER_DPI      = 250         # DPI al renderizar página PDF para OCR

# ─── Meses en español ─────────────────────────────────────────────────────────
MESES_ES: dict[str, int] = {
    "enero": 1,  "febrero": 2,  "marzo": 3,    "abril": 4,
    "mayo": 5,   "junio": 6,    "julio": 7,    "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}

# ─── Patrones por tipo de documento ───────────────────────────────────────────
# Cada entrada tiene "patrones" (lista regex) y "min_score" (mínimo de coincidencias).
# Todos los patrones se evalúan en modo IGNORECASE sobre el texto en MAYÚSCULAS.
PATRONES_TIPO: dict[str, dict] = {
    "cedula": {
        "patrones": [
            r"C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A",
            r"REP[UÚ]BLICA\s+DE\s+COLOMBIA",
            r"REGISTRADUR[IÍ]A\s+NACIONAL",
            r"\bC\.C\.",
            r"NUIP\b",
            r"TARJETA\s+DE\s+IDENTIDAD",
            r"IDENTIFICACI[OÓ]N\s+PERSONAL",
        ],
        "min_score": 1,
        "label": "Cédula de Ciudadanía",
    },
    "licencia": {
        "patrones": [
            r"LICENCIA\s+DE\s+CONDUCCI[OÓ]N",
            r"MINISTERIO\s+DE\s+TRANSPORTE",
            r"REGISTRO\s+NACIONAL\s+(?:DE\s+)?TR[AÁ]NSITO",
            r"\bRUNT\b",
            r"LICENCIA\s+(?:N[UÚ]M(?:ERO)?\.?|#|NO\.?)",
            r"CATEGOR[IÍ]A\s+(?:A|B|C|D|E)\d?\b",
            r"\bCONDUCIR\b",
        ],
        "min_score": 1,
        "label": "Licencia de Conducción",
    },
    "arl": {
        "patrones": [
            r"ADMINISTRADORA\s+DE\s+RIESGOS\s+LABORALES",
            r"\bARL\b",
            r"RIESGOS\s+LABORALES",
            r"AFILIACI[OÓ]N\s+(?:A\s+LA\s+)?ARL",
            r"POSITIVA\b|SURA\b|COLMENA\b|LIBERTY\b|COLPATRIA\b|AXA\b|ACOMP\b",
            r"COBERTURA\s+(?:DE\s+)?RIESGOS",
        ],
        "min_score": 1,
        "label": "Certificado ARL",
    },
    "soat": {
        "patrones": [
            r"\bSOAT\b",
            r"SEGURO\s+OBLIGATORIO\s+DE\s+ACCIDENTES",
            r"P[OÓ]LIZA\s+SOAT",
            r"ACCIDENTES\s+DE\s+TR[AÁ]NSITO",
            r"SEGURO\s+OBLIGATORIO\s+(?:DE\s+)?TR[AÁ]NSITO",
            r"AUTOMOTOR\s+OBLIGATORIO",
        ],
        "min_score": 1,
        "label": "SOAT",
    },
    "tecnicomecanica": {
        "patrones": [
            r"REVISI[OÓ]N\s+T[EÉ]CNO",
            r"TECNICOMEC[AÁ]NICA",
            r"\bCDA\b",
            r"CERTIFICADO\s+DE\s+REVISI[OÓ]N\s+T[EÉ]CNICO",
            r"CENTRO\s+DE\s+DIAGN[OÓ]STICO\s+AUTOMOTOR",
            r"REVISI[OÓ]N\s+VEHICULAR",
        ],
        "min_score": 1,
        "label": "Revisión Tecnomecánica",
    },
    "planilla_aportes": {
        "patrones": [
            r"\bPILA\b",
            r"PLANILLA\s+INTEGRADA\s+DE\s+LIQUIDACI[OÓ]N",
            r"APORTES\s+A\s+LA\s+SEGURIDAD\s+SOCIAL",
            r"SEGURIDAD\s+SOCIAL\s+INTEGRAL",
            r"OPERADOR\s+DE\s+INFORMACI[OÓ]N",
            r"ASOPAGOS\b|SOI\b|APORTES\s+EN\s+L[IÍ]NEA",
            r"LIQUIDACI[OÓ]N\s+DE\s+APORTES",
        ],
        "min_score": 1,
        "label": "Planilla de Aportes PILA",
    },
    "examenes_medicos": {
        "patrones": [
            r"EXAMEN\s+M[EÉ]DICO",
            r"MEDICINA\s+OCUPACIONAL",
            r"PRE[\s\-]?OCUPACIONAL",
            r"CONCEPTO\s+M[EÉ]DICO\s+OCUPACIONAL",
            r"\bAPTO\b",
            r"M[EÉ]DICO\s+OCUPACIONAL",
            r"EVALUACI[OÓ]N\s+M[EÉ]DICA\s+OCUPACIONAL",
        ],
        "min_score": 1,
        "label": "Exámenes Médicos Ocupacionales",
    },
    "certificados_especialidad": {
        "patrones": [
            r"CERTIFICADO\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N|APTITUD|COMPETENCIA)",
            r"\bSENA\b",
            r"COMPETENCIA\s+LABORAL",
            r"HORAS\s+DE\s+(?:FORMACI[OÓ]N|CAPACITACI[OÓ]N)",
            r"ENTRENAMIENTO\s+EN\b",
            r"PROGRAMA\s+DE\s+FORMACI[OÓ]N",
            r"APRENDIZAJE\b",
        ],
        "min_score": 1,
        "label": "Certificado de Especialidad",
    },
    "arl_sgsst": {
        "patrones": [
            r"SG[\s\-]?SST",
            r"SISTEMA\s+DE\s+GESTI[OÓ]N\s+DE\s+(?:LA\s+)?SEGURIDAD",
            r"SEGURIDAD\s+Y\s+SALUD\s+EN\s+EL\s+TRABAJO",
            r"CALIFICACI[OÓ]N\s+DE\s+(?:EMPRESA|CONTRATISTA|RIESGOS)",
            r"NIVEL\s+DE\s+CUMPLIMIENTO\s+SG",
            r"CICLO\s+PHVA",
        ],
        "min_score": 1,
        "label": "ARL SG-SST",
    },
    "responsable_sgsst": {
        "patrones": [
            r"RESPONSABLE\s+(?:DEL?\s+)?SG[\s\-]?SST",
            r"LICENCIA\s+EN\s+SALUD\s+OCUPACIONAL",
            r"SALUD\s+OCUPACIONAL",
            r"SG[\s\-]?SST",
            r"RESP\.\s*SST",
            r"COORDINADOR\s+(?:DE\s+)?(?:SST|SG)",
            r"PROFESIONAL\s+EN\s+SST",
        ],
        "min_score": 1,
        "label": "Responsable SG-SST",
    },
}

# ─── Patrones de fecha de vencimiento ─────────────────────────────────────────
PATRONES_FECHA = [
    # Con keyword antes — DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
    (
        r"(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|"
        r"fecha\s+(?:de\s+)?(?:vencimiento|expiraci[oó]n)|hasta\s+el|fecha\s+fin|"
        r"f\.?\s*vto|fecha\s+l[iÍ]mite)\s*[:\-]?\s*"
        r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](20\d{2})\b",
        "dmy",
    ),
    # Con keyword — D de mes de YYYY
    (
        r"(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|"
        r"hasta\s+el|fecha\s+fin)\s*[:\-]?\s*"
        r"(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|"
        r"septiembre|octubre|noviembre|diciembre)\s+(?:del?\s+)?(20\d{2})\b",
        "dmy_es",
    ),
    # Con keyword — YYYY-MM-DD
    (
        r"(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|"
        r"fecha\s+fin)\s*[:\-]?\s*(20\d{2})[/\-\.](\d{2})[/\-\.](\d{2})\b",
        "ymd",
    ),
    # Genérico sin keyword — DD/MM/YYYY (mes entre 01-12)
    (r"\b(\d{2})[/\-](1[0-2]|0[1-9])/(20[2-9]\d)\b", "dmy"),
]


# ─── Punto de entrada ──────────────────────────────────────────────────────────

def verificar(archivo_base64: str, nombre_archivo: str, tipo_esperado: str) -> dict:
    try:
        data = base64.b64decode(archivo_base64)
    except Exception:
        return _error("Archivo base64 inválido o corrupto")

    n = len(data)
    if n < MIN_BYTES:
        return _error(f"Archivo demasiado pequeño ({n:,} bytes) — posiblemente vacío")
    if n > MAX_BYTES:
        return _error(f"Archivo excede el tamaño máximo (25 MB)")

    mime = _detectar_mime(nombre_archivo, data)

    if mime == "application/pdf":
        return _verificar_pdf(data, tipo_esperado)
    elif mime.startswith("image/"):
        return _verificar_imagen(data, mime, tipo_esperado)
    else:
        return _error(f"Formato no soportado ({mime}). Solo PDF e imágenes JPG/PNG/WebP")


# ─── Detección MIME por magic bytes ───────────────────────────────────────────

def _detectar_mime(nombre: str, data: bytes) -> str:
    if data[:4] == b"%PDF":
        return "application/pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    ext = nombre.rsplit(".", 1)[-1].lower() if "." in nombre else ""
    return {
        "pdf": "application/pdf",
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png", "webp": "image/webp", "gif": "image/gif",
    }.get(ext, "application/octet-stream")


# ─── Verificación PDF ──────────────────────────────────────────────────────────

def _verificar_pdf(data: bytes, tipo_esperado: str) -> dict:
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        return _error(f"PDF inválido o corrupto: {str(e)[:100]}")

    if doc.is_encrypted:
        doc.close()
        return _error("El PDF está protegido con contraseña")

    if doc.page_count == 0:
        doc.close()
        return _error("El PDF no contiene páginas")

    texto_nativo = ""
    tiene_imagenes_embebidas = False

    for i in range(min(doc.page_count, MAX_PAGINAS)):
        p = doc[i]
        texto_nativo += p.get_text("text") + "\n"
        if p.get_images(full=False):
            tiene_imagenes_embebidas = True

    texto_nativo = texto_nativo.strip()

    # PDF con texto nativo suficiente → análisis directo
    if len(texto_nativo) >= OCR_MIN_CHARS:
        doc.close()
        return _analizar_texto(
            texto_nativo, tipo_esperado,
            fuente=f"PDF nativo ({doc.page_count}p)" if False else "PDF nativo"
        )

    # PDF escaneado → renderizar páginas y OCR multi-estrategia
    texto_ocr = ""
    for i in range(min(doc.page_count, MAX_PAGINAS)):
        pagina = doc[i]
        mat = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
        pixmap = pagina.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img_pil = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
        texto_pagina = _ocr_multi_estrategia(img_pil)
        texto_ocr += texto_pagina + "\n"

    doc.close()
    texto_ocr = texto_ocr.strip()

    if len(texto_ocr) < OCR_MIN_CHARS:
        if tiene_imagenes_embebidas:
            return {
                "es_correcto_tipo": True,
                "esta_vigente": None,
                "fecha_vencimiento_detectada": None,
                "nombre_detectado": None,
                "observacion": "PDF escaneado con imágenes — texto no legible por OCR, revisión manual recomendada",
                "confianza": "media",
            }
        return _error("PDF sin contenido legible (ni texto nativo ni imágenes)")

    return _analizar_texto(texto_ocr, tipo_esperado, fuente="PDF escaneado (OCR)")


# ─── Verificación imagen ───────────────────────────────────────────────────────

def _verificar_imagen(data: bytes, mime: str, tipo_esperado: str) -> dict:
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
    except Exception as e:
        return _error(f"Imagen inválida o corrupta: {str(e)[:100]}")

    w, h = img.size
    if w < MIN_DIM_PX or h < MIN_DIM_PX:
        return _error(f"Imagen demasiado pequeña ({w}×{h} px)")

    stat = ImageStat.Stat(img)
    if sum(stat.stddev[:3]) / 3 < MIN_STDDEV:
        return _error("La imagen parece estar en blanco o totalmente oscura")

    texto_ocr = _ocr_multi_estrategia(img)
    fmt = mime.split("/")[-1].upper()
    label = PATRONES_TIPO.get(tipo_esperado, {}).get("label", tipo_esperado)

    if len(texto_ocr.strip()) < OCR_MIN_CHARS:
        return {
            "es_correcto_tipo": True,
            "esta_vigente": None,
            "fecha_vencimiento_detectada": None,
            "nombre_detectado": None,
            "observacion": f"Imagen {fmt} válida ({w}×{h}px) — texto no legible por OCR, tipo asumido: {label}",
            "confianza": "media",
        }

    return _analizar_texto(texto_ocr, tipo_esperado, fuente=f"imagen {fmt} (OCR)")


# ─── OCR multi-estrategia ──────────────────────────────────────────────────────

def _ocr_multi_estrategia(img: Image.Image) -> str:
    """
    Prueba varias preparaciones y devuelve el texto con más caracteres.
    Estrategias:
      1. Escala mínima 1600px, escala grises, contraste ×2
      2. Igual + filtro de nitidez
      3. Igual + binarización adaptada (threshold)
      4. PSM 11 (texto disperso) con escala grises
    """
    img_rgb = img.convert("RGB")
    w, h = img_rgb.size

    # Escalar si demasiado pequeña
    if w < 1600:
        scale = 1600 / w
        img_rgb = img_rgb.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    mejor = ""

    def _run(img_proc: Image.Image, config: str) -> str:
        try:
            return pytesseract.image_to_string(img_proc, lang=TESSERACT_LANG, config=config)
        except Exception:
            return ""

    # Estrategia 1 — escala grises + contraste
    g1 = ImageEnhance.Contrast(img_rgb.convert("L")).enhance(2.0)
    t1 = _run(g1, TESSERACT_CONFIG)
    if len(t1) > len(mejor):
        mejor = t1

    # Estrategia 2 — escala grises + contraste fuerte + nitidez
    g2 = ImageEnhance.Contrast(img_rgb.convert("L")).enhance(3.0).filter(ImageFilter.SHARPEN)
    t2 = _run(g2, TESSERACT_CONFIG)
    if len(t2) > len(mejor):
        mejor = t2

    # Estrategia 3 — binarización fija (funciona bien en documentos impresos)
    g3 = img_rgb.convert("L").point(lambda x: 255 if x > 140 else 0)
    t3 = _run(g3, TESSERACT_CONFIG)
    if len(t3) > len(mejor):
        mejor = t3

    # Estrategia 4 — escala grises + texto disperso (fotos de documentos físicos)
    g4 = ImageEnhance.Contrast(img_rgb.convert("L")).enhance(2.0)
    t4 = _run(g4, TESSERACT_CONFIG_SPARSE)
    if len(t4) > len(mejor):
        mejor = t4

    return mejor


# ─── Análisis de texto extraído ───────────────────────────────────────────────

def _analizar_texto(texto: str, tipo_esperado: str, fuente: str) -> dict:
    texto_upper = texto.upper()
    info = PATRONES_TIPO.get(tipo_esperado, {})
    min_score = info.get("min_score", 1)
    label = info.get("label", tipo_esperado)

    score = _score_tipo(texto_upper, tipo_esperado)
    es_correcto = score >= min_score

    fecha_venc, esta_vigente = _extraer_fecha_vencimiento(texto)
    nombre = _extraer_nombre(texto)

    if es_correcto:
        confianza = "alta" if score >= 2 else "media"
        obs = f"Documento identificado como {label} · {fuente}"
    else:
        confianza = "media"
        obs = f"Contenido no coincide con el tipo esperado ({label}) · {fuente}"

    if esta_vigente is False:
        obs += " · DOCUMENTO VENCIDO"
        confianza = "baja"

    return {
        "es_correcto_tipo": es_correcto,
        "esta_vigente": esta_vigente,
        "fecha_vencimiento_detectada": fecha_venc,
        "nombre_detectado": nombre,
        "observacion": obs[:150],
        "confianza": confianza,
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _score_tipo(texto_upper: str, tipo: str) -> int:
    info = PATRONES_TIPO.get(tipo)
    if not info:
        return 0
    return sum(
        1 for p in info["patrones"]
        if re.search(p, texto_upper, re.IGNORECASE)
    )


def _extraer_fecha_vencimiento(texto: str) -> tuple[Optional[str], Optional[bool]]:
    hoy = date.today()
    t = texto.lower()
    for patron, fmt in PATRONES_FECHA:
        m = re.search(patron, t, re.IGNORECASE)
        if not m:
            continue
        try:
            if fmt == "dmy":
                d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            elif fmt == "ymd":
                y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            elif fmt == "dmy_es":
                d  = int(m.group(1))
                mo = MESES_ES.get(m.group(2).lower(), 0)
                y  = int(m.group(3))
            else:
                continue
            if not (1 <= mo <= 12 and 1 <= d <= 31 and 2000 <= y <= 2060):
                continue
            f = date(y, mo, d)
            return f.isoformat(), f >= hoy
        except (ValueError, TypeError):
            continue
    return None, None


def _extraer_nombre(texto: str) -> Optional[str]:
    patrones = [
        r"(?:nombres?\s+y\s+apellidos?|titular|nombre\s+completo|nombre\s+del?\s+trabajador)\s*[:\-]?\s*"
        r"([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?=\n|\r|$|\s{2,})",
        r"(?:certifica\s+que)\s+(?:el\s+señor|la\s+señora)?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?:\s+identificad|\s+con\s+c)",
        r"(?:señor[a]?\s+)([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?:\s+identificad|\s+con\s+)",
    ]
    tu = texto.upper()
    for p in patrones:
        m = re.search(p, tu, re.MULTILINE)
        if m:
            nombre = m.group(1).strip()
            palabras = nombre.split()
            if 2 <= len(palabras) <= 6:
                return nombre.title()
    return None


def _error(observacion: str) -> dict:
    return {
        "es_correcto_tipo": False,
        "esta_vigente": None,
        "fecha_vencimiento_detectada": None,
        "nombre_detectado": None,
        "observacion": observacion[:150],
        "confianza": "baja",
    }
