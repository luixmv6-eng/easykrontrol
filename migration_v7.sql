-- Migration v7 — Verificación automática de documentos (Python)

-- 1. Expandir tipos válidos en documentos_personal
ALTER TABLE public.documentos_personal
  DROP CONSTRAINT IF EXISTS documentos_personal_tipo_check;

ALTER TABLE public.documentos_personal
  ADD CONSTRAINT documentos_personal_tipo_check
  CHECK (tipo IN (
    'cedula', 'licencia', 'arl', 'soat', 'tecnicomecanica',
    'planilla_aportes', 'examenes_medicos', 'certificados_especialidad',
    'arl_sgsst', 'responsable_sgsst'
  ));

-- 2. Columnas de verificación automática
ALTER TABLE public.documentos_personal
  ADD COLUMN IF NOT EXISTS verificado_auto        BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verificacion_confianza TEXT
    CHECK (verificacion_confianza IN ('alta', 'media', 'baja')),
  ADD COLUMN IF NOT EXISTS verificacion_observacion TEXT,
  ADD COLUMN IF NOT EXISTS verificacion_resultado  JSONB,
  ADD COLUMN IF NOT EXISTS verificado_at         TIMESTAMPTZ;
