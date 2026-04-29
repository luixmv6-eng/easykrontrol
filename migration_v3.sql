-- ══════════════════════════════════════════════════════
-- EASY KONTROL — Migración v3
-- Ejecutar DESPUÉS de migration_v2.sql
-- ══════════════════════════════════════════════════════

-- ── 1. Tabla grupos_ingreso ───────────────────────────
CREATE TABLE IF NOT EXISTS public.grupos_ingreso (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  estado       TEXT DEFAULT 'pendiente'
               CHECK (estado IN ('pendiente','revision','completado')),
  creado_por   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Nuevas columnas en personal ───────────────────
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS fecha_entrada  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_fin      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grupo_id       UUID REFERENCES public.grupos_ingreso(id),
  ADD COLUMN IF NOT EXISTS vehiculo_id    UUID REFERENCES public.vehiculos(id),
  ADD COLUMN IF NOT EXISTS en_correccion  BOOLEAN DEFAULT FALSE;

-- ── 3. Fix RLS personal — usar profiles.proveedor_id ─
DROP POLICY IF EXISTS "personal_prov_select" ON public.personal;
DROP POLICY IF EXISTS "personal_prov_insert" ON public.personal;
DROP POLICY IF EXISTS "personal_prov_update" ON public.personal;

CREATE POLICY "personal_prov_select"
  ON public.personal FOR SELECT TO authenticated
  USING(proveedor_id = (
    SELECT proveedor_id FROM public.profiles
    WHERE id = auth.uid() AND proveedor_id IS NOT NULL
  ));

CREATE POLICY "personal_prov_insert"
  ON public.personal FOR INSERT TO authenticated
  WITH CHECK(proveedor_id = (
    SELECT proveedor_id FROM public.profiles
    WHERE id = auth.uid() AND proveedor_id IS NOT NULL
  ));

-- Proveedores pueden editar personal rechazado para corrección
CREATE POLICY "personal_prov_update"
  ON public.personal FOR UPDATE TO authenticated
  USING(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
    AND estado = 'rechazado'
  )
  WITH CHECK(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- ── 4. Fix RLS documentos_personal ───────────────────
DROP POLICY IF EXISTS "docs_prov_all" ON public.documentos_personal;

CREATE POLICY "docs_prov_all"
  ON public.documentos_personal FOR ALL TO authenticated
  USING(personal_id IN (
    SELECT p.id FROM public.personal p
    WHERE p.proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  ))
  WITH CHECK(personal_id IN (
    SELECT p.id FROM public.personal p
    WHERE p.proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  ));

-- ── 5. Fix RLS vehiculos ──────────────────────────────
DROP POLICY IF EXISTS "vehiculos_prov" ON public.vehiculos;

CREATE POLICY "vehiculos_prov"
  ON public.vehiculos FOR ALL TO authenticated
  USING(proveedor_id = (
    SELECT proveedor_id FROM public.profiles
    WHERE id = auth.uid() AND proveedor_id IS NOT NULL
  ))
  WITH CHECK(proveedor_id = (
    SELECT proveedor_id FROM public.profiles
    WHERE id = auth.uid() AND proveedor_id IS NOT NULL
  ));

-- ── 6. RLS grupos_ingreso ─────────────────────────────
ALTER TABLE public.grupos_ingreso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_admin"
  ON public.grupos_ingreso FOR ALL TO authenticated
  USING(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "grupos_prov_select"
  ON public.grupos_ingreso FOR SELECT TO authenticated
  USING(proveedor_id = (
    SELECT proveedor_id FROM public.profiles
    WHERE id = auth.uid() AND proveedor_id IS NOT NULL
  ));

CREATE POLICY "grupos_prov_insert"
  ON public.grupos_ingreso FOR INSERT TO authenticated
  WITH CHECK(proveedor_id = (
    SELECT proveedor_id FROM public.profiles
    WHERE id = auth.uid() AND proveedor_id IS NOT NULL
  ));

-- ── 7. Función KPI actualizada ────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'total_personal',         (SELECT COUNT(*) FROM public.personal
                               WHERE estado NOT IN ('inactivo') AND (fecha_fin IS NULL OR fecha_fin > NOW())),
    'personal_aprobado',      (SELECT COUNT(*) FROM public.personal
                               WHERE estado = 'aprobado' AND (fecha_fin IS NULL OR fecha_fin > NOW())),
    'personal_pendiente',     (SELECT COUNT(*) FROM public.personal
                               WHERE estado = 'pendiente' AND en_correccion = FALSE AND grupo_id IS NULL),
    'personal_rechazado',     (SELECT COUNT(*) FROM public.personal WHERE estado = 'rechazado'),
    'personal_en_correccion', (SELECT COUNT(*) FROM public.personal WHERE en_correccion = TRUE),
    'grupos_pendientes',      (SELECT COUNT(*) FROM public.grupos_ingreso WHERE estado = 'pendiente'),
    'vehiculos_activos',      (SELECT COUNT(*) FROM public.vehiculos WHERE estado = 'activo'),
    'proveedores_activos',    (SELECT COUNT(*) FROM public.proveedores WHERE estado = 'activo'),
    'documentos_por_vencer',  (SELECT COUNT(*) FROM public.documentos_por_vencer),
    'personal_historial',     (SELECT COUNT(*) FROM public.personal
                               WHERE estado = 'inactivo' OR (fecha_fin IS NOT NULL AND fecha_fin <= NOW()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
