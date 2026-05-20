-- Migration v6 — Checklist F-P-ECC-001-05 (revisiones por contratista)

CREATE TABLE public.revisiones_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  revisado_por UUID NOT NULL REFERENCES auth.users(id),
  fecha_revision TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Estado de cada requisito: 'ok' | 'na' | 'pendiente'
  req_eps_arl_afp TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_eps_arl_afp IN ('ok', 'na', 'pendiente')),
  req_planilla_aportes TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_planilla_aportes IN ('ok', 'na', 'pendiente')),
  req_examenes_medicos TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_examenes_medicos IN ('ok', 'na', 'pendiente')),
  req_cedula TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_cedula IN ('ok', 'na', 'pendiente')),
  req_relacion_personal TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_relacion_personal IN ('ok', 'na', 'pendiente')),
  req_relacion_vehiculos TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_relacion_vehiculos IN ('ok', 'na', 'pendiente')),
  req_soportes_vehiculos TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_soportes_vehiculos IN ('ok', 'na', 'pendiente')),
  req_licencia_conductor TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_licencia_conductor IN ('ok', 'na', 'pendiente')),
  req_certificados_especialidad TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_certificados_especialidad IN ('ok', 'na', 'pendiente')),
  req_arl_sgsst TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_arl_sgsst IN ('ok', 'na', 'pendiente')),
  req_responsable_sgsst TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (req_responsable_sgsst IN ('ok', 'na', 'pendiente')),

  -- Observaciones por requisito (opcionales)
  obs_eps_arl_afp TEXT,
  obs_planilla_aportes TEXT,
  obs_examenes_medicos TEXT,
  obs_cedula TEXT,
  obs_relacion_personal TEXT,
  obs_relacion_vehiculos TEXT,
  obs_soportes_vehiculos TEXT,
  obs_licencia_conductor TEXT,
  obs_certificados_especialidad TEXT,
  obs_arl_sgsst TEXT,
  obs_responsable_sgsst TEXT,

  -- Concepto final
  concepto TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (concepto IN ('cumple', 'cumple_parcial', 'no_cumple', 'pendiente')),

  -- Firmantes
  firmante1_nombre TEXT,
  firmante1_cargo TEXT,
  firmante2_nombre TEXT,
  firmante2_cargo TEXT,

  -- Observaciones generales
  observaciones_generales TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Una revisión por persona (upsert)
  UNIQUE (personal_id)
);

-- RLS
ALTER TABLE public.revisiones_checklist ENABLE ROW LEVEL SECURITY;

-- Admin puede todo
CREATE POLICY "checklist_admin" ON public.revisiones_checklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Proveedor puede ver el checklist de su personal (solo lectura)
CREATE POLICY "checklist_prov_select" ON public.revisiones_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.personal p
      JOIN public.profiles pr ON pr.id = auth.uid()
      WHERE p.id = personal_id AND p.proveedor_id = pr.proveedor_id
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_checklist_updated_at
  BEFORE UPDATE ON public.revisiones_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
