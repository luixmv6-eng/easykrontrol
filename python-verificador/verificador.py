"""
Verificación robusta de documentos colombianos.
PDF digitales → PyMuPDF (texto nativo).
PDFs escaneados + fotos (JPEG/PNG) → Tesseract OCR (español).
Sin dependencias de IA — 100% local.
"""

import io
import re
import base64
from datetime import date
from typing import Optional

import fitz  # PyMuPDF
from PIL import Image, ImageStat, ImageOps, ImageFilter, ImageEnhance
import pytesseract

# ─── Umbrales ────────────────────────────────────────────────────────────────
MIN_BYTES = 3_000
MAX_BYTES = 25_000_000
MIN_STDDEV_IMAGEN = 4.0
MIN_DIM_PX = 80
MAX_PAGINAS_OCR = 4       # páginas máximas a procesar por OCR
OCR_DPI_RENDER = 250      # DPI al renderizar página PDF para OCR
OCR_MIN_CHARS = 20        # caracteres mínimos para considerar OCR exitoso

# ─── Idioma Tesseract ─────────────────────────────────────────────────────────
# "spa" requiere tesseract-ocr-spa instalado; "spa+eng" como fallback
TESSERACT_LANG = "spa+eng"

# ─── Meses en español ────────────────────────────────────────────────────────
MESES_ES: dict[str, int] = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}

# ─── Patrones por tipo de documento ──────────────────────────────────────────
PATRONES_TIPO: dict[str, dict] = {
    "cedula": {
        "patrones": [
            r"C[EÉ]DULA\s+DE\s+CIUDADAN[IÍ]A",
            r"REP[UÚ]BLICA\s+DE\s+COLOMBIA",
            r"REGISTRADUR[IÍ]A\s+NACIONAL",
            r"\bC\.C\.",
            r"TARJETA\s+DE\s+IDENTIDAD",
            r"IDENTIFICACI[OÓ]N\s+PERSONAL",
            r"NUIP\b",
        ],
        "min_score": 1,
        "label": "Cédula de Ciudadanía",
    },
    "licencia": {
        "patrones": [
            r"LICENCIA\s+DE\s+CONDUCCI[OÓ]N",
            r"MINISTERIO\s+DE\s+TRANSPORTE",
            r"REGISTRO\s+NACIONAL\s+DE\s+TR[AÁ]NSITO",
            r"\bRUNT\b",
            r"LICENCIA\s+(?:N[UÚ]M(?:ERO)?\.?|#)",
            r"CATEGOR[IÍ]A\s+(?:A|B|C|D|E)\b",
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
            r"POSITIVA|SURA\b|COLMENA|LIBERTY|COLPATRIA|AXA|ACOMP",
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
            r"SEGURO\s+OBLIGATORIO\s+DE\s+TR[AÁ]NSITO",
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
            r"ASOPAGOS|SOI\b|APORTES\s+EN\s+L[IÍ]NEA",
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
            r"COORDINADOR\s+(?:DE\s+)?SST",
        ],
        "min_score": 1,
        "label": "Responsable SG-SST",
    },
}

# ─── Patrones de fecha de vencimiento ────────────────────────────────────────
PATRONES_FECHA = [
    (
        r"(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|"
        r"fecha\s+(?:de\s+)?vencimiento|hasta\s+el|fecha\s+fin|f\.?\s*vto)\s*[:\-]?\s*"
        r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](20\d{2})\b",
        "dmy",
    ),
    (
        r"(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|"
        r"hasta\s+el|fecha\s+fin)\s*[:\-]?\s*"
        r"(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|"
        r"septiembre|octubre|noviembre|diciembre)\s+(?:del?\s+)?(20\d{2})\b",
        "dmy_es",
    ),
    (
        r"(?:vence?|vencimiento|vigencia|v[aá]lido\s+hasta|expira(?:ci[oó]n)?|"
        r"fecha\s+fin)\s*[:\-]?\s*(20\d{2})[/\-\.](\d{2})[/\-\.](\d{2})\b",
        "ymd",
    ),
    # Genérico sin palabra clave (menor prioridad)
    (r"\b(\d{2})[/\-](1[0-2]|0[1-9])/(20[2-9]\d)\b", "dmy"),
]


# ─── Punto de entrada ─────────────────────────────────────────────────────────

def verificar(archivo_base64: str, nombre_archivo: str, tipo_esperado: str) -> dict:
    try:
        data = base64.b64decode(archivo_base64)
    except Exception:
        return _error("Archivo base64 inválido o corrupto")

    n = len(data)
    if n < MIN_BYTES:
        return _error(f"Archivo demasiado pequeño ({n:,} bytes) — posiblemente vacío")
    if n > MAX_BYTES:
        return _error(f"Archivo excede el tamaño máximo de 25 MB ({n // 1_000_000} MB)")

    mime = _detectar_mime(nombre_archivo, data)

    if mime == "application/pdf":
        return _verificar_pdf(data, tipo_esperado)
    elif mime.startswith("image/"):
        return _verificar_imagen(data, mime, tipo_esperado)
    else:
        return _error(f"Formato no soportado ({mime}). Solo PDF e imágenes JPG/PNG/WebP")


# ─── MIME por magic bytes ─────────────────────────────────────────────────────

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


# ─── Verificación PDF ─────────────────────────────────────────────────────────

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

    # Extraer texto nativo de todas las páginas
    texto_nativo = ""
    tiene_imagenes_embebidas = False

    for i in range(min(doc.page_count, MAX_PAGINAS_OCR)):
        p = doc[i]
        texto_nativo += p.get_text("text") + "\n"
        if p.get_images(full=False):
            tiene_imagenes_embebidas = True

    texto_nativo = texto_nativo.strip()

    # Si el PDF tiene texto nativo suficiente → usarlo directamente
    if len(texto_nativo) >= OCR_MIN_CHARS:
        doc.close()
        return _analizar_texto(texto_nativo, tipo_esperado, fuente="PDF nativo")

    # PDF escaneado (imágenes adentro sin capa de texto) → OCR página por página
    texto_ocr = ""
    for i in range(min(doc.page_count, MAX_PAGINAS_OCR)):
        pagina = doc[i]
        mat = fitz.Matrix(OCR_DPI_RENDER / 72, OCR_DPI_RENDER / 72)
        pixmap = pagina.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img_pil = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
        img_pre = _preprocesar_para_ocr(img_pil)
        texto_ocr += pytesseract.image_to_string(img_pre, lang=TESSERACT_LANG) + "\n"

    doc.close()
    texto_ocr = texto_ocr.strip()

    if len(texto_ocr) < OCR_MIN_CHARS:
        # El PDF tiene imágenes pero OCR no extrajo nada legible
        if tiene_imagenes_embebidas:
            return {
                "es_correcto_tipo": True,
                "esta_vigente": None,
                "fecha_vencimiento_detectada": None,
                "nombre_detectado": None,
                "observacion": "PDF con imágenes pero texto no legible por OCR — revisión manual recomendada",
                "confianza": "media",
            }
        return _error("PDF sin contenido legible")

    return _analizar_texto(texto_ocr, tipo_esperado, fuente="PDF escaneado (OCR)")


# ─── Verificación imagen (JPEG/PNG/WebP) ─────────────────────────────────────

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
    stddev_prom = sum(stat.stddev[:3]) / 3
    if stddev_prom < MIN_STDDEV_IMAGEN:
        return _error(f"La imagen parece estar en blanco o totalmente oscura")

    # OCR sobre la imagen
    img_pre = _preprocesar_para_ocr(img)
    texto_ocr = pytesseract.image_to_string(img_pre, lang=TESSERACT_LANG)

    fmt = mime.split("/")[-1].upper()
    label = PATRONES_TIPO.get(tipo_esperado, {}).get("label", tipo_esperado)

    if len(texto_ocr.strip()) < OCR_MIN_CHARS:
        # Imagen válida pero OCR no pudo leer texto (foto muy borrosa, oscura, etc.)
        return {
            "es_correcto_tipo": True,
            "esta_vigente": None,
            "fecha_vencimiento_detectada": None,
            "nombre_detectado": None,
            "observacion": f"Imagen {fmt} válida ({w}×{h}px) pero texto no legible — tipo asumido: {label}",
            "confianza": "media",
        }

    return _analizar_texto(texto_ocr, tipo_esperado, fuente=f"imagen {fmt} (OCR)")


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


# ─── Preprocesamiento de imagen para OCR ────────────────────────────────────

def _preprocesar_para_ocr(img: Image.Image) -> Image.Image:
    """
    Optimiza la imagen para Tesseract:
    1. Escala a mínimo 1500px de ancho (Tesseract funciona mejor con imágenes grandes)
    2. Convierte a escala de grises
    3. Aumenta el contraste
    4. Aplica ligero nitidez
    """
    img = img.convert("RGB")
    w, h = img.size

    # Escalar si la imagen es demasiado pequeña
    if w < 1500:
        factor = 1500 / w
        nuevo_w = int(w * factor)
        nuevo_h = int(h * factor)
        img = img.resize((nuevo_w, nuevo_h), Image.LANCZOS)

    # Escala de grises
    img = img.convert("L")

    # Aumento de contraste
    img = ImageEnhance.Contrast(img).enhance(2.0)

    # Nitidez
    img = img.filter(ImageFilter.SHARPEN)

    return img


# ─── Helpers ─────────────────────────────────────────────────────────────────

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
                d = int(m.group(1))
                mo = MESES_ES.get(m.group(2).lower(), 0)
                y = int(m.group(3))
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
        r"(?:nombres?\s+y\s+apellidos?|titular|nombre\s+completo)\s*[:\-]?\s*"
        r"([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?=\n|\r|$|\s{2,})",
        r"(?:se\s+certifica\s+que)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?:\s+identificad|\s+con\s+c)",
        r"(?:señor[a]?)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,55}?)(?:\s+identificad|\s+con\s+)",
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
