-- ══════════════════════════════════════════════════════
-- EASY KONTROL — Corrección de políticas RLS
-- Ejecutar en: Supabase → SQL Editor → New Query
--
-- Problema: las políticas originales asumían que cada proveedor
-- crea su propia empresa (created_by = auth.uid()).
-- Ahora el admin crea las empresas y las vincula a usuarios
-- via profiles.proveedor_id. Las políticas necesitan reflejar eso.
-- ══════════════════════════════════════════════════════

-- ── personal ─────────────────────────────────────────

DROP POLICY IF EXISTS "personal_prov_select" ON public.personal;
DROP POLICY IF EXISTS "personal_prov_insert" ON public.personal;
DROP POLICY IF EXISTS "personal_prov_update" ON public.personal;

-- El proveedor ve el personal de SU empresa (via profiles.proveedor_id)
CREATE POLICY "personal_prov_select"
  ON public.personal FOR SELECT TO authenticated
  USING(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- El proveedor solo puede registrar personal en SU empresa
CREATE POLICY "personal_prov_insert"
  ON public.personal FOR INSERT TO authenticated
  WITH CHECK(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- El proveedor solo puede modificar personal de SU empresa
CREATE POLICY "personal_prov_update"
  ON public.personal FOR UPDATE TO authenticated
  USING(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  )
  WITH CHECK(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- ── documentos_personal ──────────────────────────────

DROP POLICY IF EXISTS "docs_prov_all" ON public.documentos_personal;

CREATE POLICY "docs_prov_all"
  ON public.documentos_personal FOR ALL TO authenticated
  USING(
    personal_id IN (
      SELECT p.id FROM public.personal p
      WHERE p.proveedor_id = (
        SELECT proveedor_id FROM public.profiles
        WHERE id = auth.uid() AND proveedor_id IS NOT NULL
      )
    )
  )
  WITH CHECK(
    personal_id IN (
      SELECT p.id FROM public.personal p
      WHERE p.proveedor_id = (
        SELECT proveedor_id FROM public.profiles
        WHERE id = auth.uid() AND proveedor_id IS NOT NULL
      )
    )
  );

-- ── vehiculos ─────────────────────────────────────────

DROP POLICY IF EXISTS "vehiculos_prov" ON public.vehiculos;

CREATE POLICY "vehiculos_prov"
  ON public.vehiculos FOR ALL TO authenticated
  USING(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  )
  WITH CHECK(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- ── evaluaciones ─────────────────────────────────────

DROP POLICY IF EXISTS "eval_prov_select" ON public.evaluaciones;

CREATE POLICY "eval_prov_select"
  ON public.evaluaciones FOR SELECT TO authenticated
  USING(
    proveedor_id = (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- ── detalle_evaluacion ───────────────────────────────

DROP POLICY IF EXISTS "detalle_prov_select" ON public.detalle_evaluacion;

CREATE POLICY "detalle_prov_select"
  ON public.detalle_evaluacion FOR SELECT TO authenticated
  USING(
    evaluacion_id IN (
      SELECT e.id FROM public.evaluaciones e
      WHERE e.proveedor_id = (
        SELECT proveedor_id FROM public.profiles
        WHERE id = auth.uid() AND proveedor_id IS NOT NULL
      )
    )
  );
