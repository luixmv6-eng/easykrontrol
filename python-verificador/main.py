"""
Servicio FastAPI — Verificador de Documentos
Expone POST /verificar para validar PDFs e imágenes de documentos colombianos.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from verificador import verificar

app = FastAPI(
    title="Verificador de Documentos",
    description="Verifica que archivos PDF/imagen corresponden al tipo de documento colombiano esperado.",
    version="1.0.0",
)


class VerificacionRequest(BaseModel):
    archivo_base64: str
    nombre_archivo: str
    tipo_esperado: str


class VerificacionResponse(BaseModel):
    es_correcto_tipo: bool
    esta_vigente: bool | None
    fecha_vencimiento_detectada: str | None
    nombre_detectado: str | None
    observacion: str
    confianza: str  # "alta" | "media" | "baja"


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/verificar", response_model=VerificacionResponse)
def verificar_documento(req: VerificacionRequest) -> VerificacionResponse:
    resultado = verificar(req.archivo_base64, req.nombre_archivo, req.tipo_esperado)
    return VerificacionResponse(**resultado)
