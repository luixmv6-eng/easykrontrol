-- ══════════════════════════════════════════════════════
-- EASY KONTROL — Migración v2
-- Ejecutar en: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════════

-- ── 1. Agregar proveedor_id a profiles ────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES public.proveedores(id);

-- ── 2. Tabla: personal ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personal (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id    UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  nombres         TEXT NOT NULL,
  cedula          TEXT NOT NULL,
  estado          TEXT DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','aprobado','rechazado','inactivo')),
  aprobado_por    UUID REFERENCES auth.users(id),
  aprobado_at     TIMESTAMPTZ,
  motivo_rechazo  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proveedor_id, cedula)
);

-- ── 3. Tabla: documentos_personal ────────────────────
CREATE TABLE IF NOT EXISTS public.documentos_personal (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id           UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL
                        CHECK (tipo IN ('cedula','licencia','arl','soat','tecnicomecanica')),
  url                   TEXT NOT NULL,
  nombre_archivo        TEXT,
  fecha_inicio_vigencia DATE,
  fecha_vencimiento     DATE,
  alerta_60_enviada     BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (personal_id, tipo)
);

-- ── 4. Trigger: calcular fecha_vencimiento automáticamente ──
CREATE OR REPLACE FUNCTION public.calcular_vencimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_inicio_vigencia IS NOT NULL
     AND NEW.tipo IN ('soat','tecnicomecanica') THEN
    NEW.fecha_vencimiento := NEW.fecha_inicio_vigencia + INTERVAL '1 year';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_vencimiento ON public.documentos_personal;
CREATE TRIGGER trg_calcular_vencimiento
  BEFORE INSERT OR UPDATE ON public.documentos_personal
  FOR EACH ROW EXECUTE FUNCTION public.calcular_vencimiento();

-- ── 5. Tabla: vehiculos ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehiculos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id  UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  placa         TEXT NOT NULL,
  marca         TEXT,
  modelo        TEXT,
  tipo          TEXT,
  estado        TEXT DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proveedor_id, placa)
);

-- ── 6. Tabla: criterios_evaluacion ───────────────────
CREATE TABLE IF NOT EXISTS public.criterios_evaluacion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  peso        NUMERIC(5,2) DEFAULT 1.0,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Tabla: evaluaciones ────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id  UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  evaluado_por  UUID REFERENCES auth.users(id),
  periodo       TEXT NOT NULL,
  puntaje_total NUMERIC(5,2),
  estado        TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador','finalizado')),
  observaciones TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. Tabla: detalle_evaluacion ─────────────────────
CREATE TABLE IF NOT EXISTS public.detalle_evaluacion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
  criterio_id   UUID NOT NULL REFERENCES public.criterios_evaluacion(id),
  puntaje       NUMERIC(5,2) NOT NULL CHECK (puntaje BETWEEN 0 AND 100),
  observacion   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. Tabla: email_logs ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id  UUID REFERENCES public.personal(id),
  tipo         TEXT NOT NULL
               CHECK (tipo IN ('aprobacion','rechazo','alerta_vencimiento')),
  destinatario TEXT NOT NULL,
  asunto       TEXT,
  estado       TEXT DEFAULT 'enviado',
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. Vista: documentos próximos a vencer ───────────
CREATE OR REPLACE VIEW public.documentos_por_vencer AS
SELECT
  dp.id,
  dp.personal_id,
  p.nombres,
  p.cedula,
  pv.id          AS proveedor_id,
  pv.nombre      AS proveedor,
  pv.email       AS proveedor_email,
  dp.tipo,
  dp.fecha_vencimiento,
  (dp.fecha_vencimiento - CURRENT_DATE)::INTEGER AS dias_restantes,
  dp.alerta_60_enviada
FROM public.documentos_personal dp
JOIN public.personal    p  ON p.id  = dp.personal_id
JOIN public.proveedores pv ON pv.id = p.proveedor_id
WHERE dp.fecha_vencimiento IS NOT NULL
  AND dp.fecha_vencimiento > CURRENT_DATE
  AND (dp.fecha_vencimiento - CURRENT_DATE) <= 60
ORDER BY dp.fecha_vencimiento ASC;

-- ── 11. Función: KPIs del dashboard ──────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'total_personal',        (SELECT COUNT(*) FROM public.personal),
    'personal_aprobado',     (SELECT COUNT(*) FROM public.personal WHERE estado = 'aprobado'),
    'personal_pendiente',    (SELECT COUNT(*) FROM public.personal WHERE estado = 'pendiente'),
    'personal_rechazado',    (SELECT COUNT(*) FROM public.personal WHERE estado = 'rechazado'),
    'vehiculos_activos',     (SELECT COUNT(*) FROM public.vehiculos WHERE estado = 'activo'),
    'proveedores_activos',   (SELECT COUNT(*) FROM public.proveedores WHERE estado = 'activo'),
    'documentos_por_vencer', (SELECT COUNT(*) FROM public.documentos_por_vencer)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════
-- RLS — Row Level Security
-- ══════════════════════════════════════════════════════

ALTER TABLE public.personal              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_personal   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios_evaluacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_evaluacion    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs            ENABLE ROW LEVEL SECURITY;

-- personal
CREATE POLICY "personal_admin"
  ON public.personal FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "personal_prov_select"
  ON public.personal FOR SELECT TO authenticated
  USING(proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()));

CREATE POLICY "personal_prov_insert"
  ON public.personal FOR INSERT TO authenticated
  WITH CHECK(proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()));

CREATE POLICY "personal_prov_update"
  ON public.personal FOR UPDATE TO authenticated
  USING     (proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()))
  WITH CHECK(proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()));

-- documentos_personal
CREATE POLICY "docs_admin"
  ON public.documentos_personal FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "docs_prov_all"
  ON public.documentos_personal FOR ALL TO authenticated
  USING(personal_id IN (
    SELECT p.id FROM public.personal p
    WHERE p.proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid())
  ))
  WITH CHECK(personal_id IN (
    SELECT p.id FROM public.personal p
    WHERE p.proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid())
  ));

-- vehiculos
CREATE POLICY "vehiculos_admin"
  ON public.vehiculos FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "vehiculos_prov"
  ON public.vehiculos FOR ALL TO authenticated
  USING     (proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()))
  WITH CHECK(proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()));

-- criterios_evaluacion
CREATE POLICY "criterios_select"
  ON public.criterios_evaluacion FOR SELECT TO authenticated USING(true);

CREATE POLICY "criterios_admin"
  ON public.criterios_evaluacion FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

-- evaluaciones
CREATE POLICY "eval_admin"
  ON public.evaluaciones FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "eval_prov_select"
  ON public.evaluaciones FOR SELECT TO authenticated
  USING(proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid()));

-- detalle_evaluacion
CREATE POLICY "detalle_admin"
  ON public.detalle_evaluacion FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "detalle_prov_select"
  ON public.detalle_evaluacion FOR SELECT TO authenticated
  USING(evaluacion_id IN (
    SELECT e.id FROM public.evaluaciones e
    WHERE e.proveedor_id IN (SELECT id FROM public.proveedores WHERE created_by=auth.uid())
  ));

-- email_logs
CREATE POLICY "email_logs_admin"
  ON public.email_logs FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

-- ══════════════════════════════════════════════════════
-- Storage bucket: documentos
-- ══════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos','documentos',false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_docs_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='documentos');

CREATE POLICY "storage_docs_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='documentos');

CREATE POLICY "storage_docs_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='documentos');

-- ══════════════════════════════════════════════════════
-- Datos iniciales: criterios de evaluación
-- ══════════════════════════════════════════════════════
INSERT INTO public.criterios_evaluacion (nombre, descripcion, peso) VALUES
  ('Cumplimiento documental',         'Entrega oportuna y completa de documentos requeridos', 25.0),
  ('Seguridad y salud en el trabajo', 'Cumplimiento de normas HSE y accidentalidad',          25.0),
  ('Calidad del servicio',            'Nivel de satisfacción del área solicitante',           20.0),
  ('Cumplimiento contractual',        'Cumplimiento de plazos y condiciones del contrato',    20.0),
  ('Comunicación y respuesta',        'Tiempo de respuesta y comunicación efectiva',          10.0)
ON CONFLICT DO NOTHING;
