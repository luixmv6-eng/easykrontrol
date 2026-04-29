-- ══════════════════════════════════════════════════════
-- EASY KONTROL — Tabla proveedores + RLS
-- Ejecutar ANTES de migration_v2.sql si es primera vez
-- ══════════════════════════════════════════════════════

-- ── Tabla: proveedores ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  nit         TEXT NOT NULL UNIQUE,
  email       TEXT,
  telefono    TEXT,
  direccion   TEXT,
  estado      TEXT DEFAULT 'activo'
              CHECK (estado IN ('activo','inactivo','suspendido')),
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_admin"       ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_prov_select" ON public.proveedores;

CREATE POLICY "proveedores_admin"
  ON public.proveedores FOR ALL TO authenticated
  USING     (EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'))
  WITH CHECK(EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND rol='admin'));

CREATE POLICY "proveedores_prov_select"
  ON public.proveedores FOR SELECT TO authenticated
  USING(
    created_by = auth.uid()
    OR
    id IN (
      SELECT proveedor_id FROM public.profiles
      WHERE id = auth.uid() AND proveedor_id IS NOT NULL
    )
  );

-- ── Trigger updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON public.proveedores;
CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════
-- Datos de prueba — eliminar en producción
-- Usa WHERE NOT EXISTS en lugar de ON CONFLICT
-- para evitar dependencia en nombres de constraints
-- ══════════════════════════════════════════════════════
INSERT INTO public.proveedores (nombre, nit, email, telefono, direccion, created_by)
SELECT
  'Transportes García S.A.S',
  '900123456-1',
  'contacto@transportesgarcia.com',
  '3001234567',
  'Calle 10 # 5-30, Bogotá',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.proveedores WHERE nit = '900123456-1'
);

INSERT INTO public.proveedores (nombre, nit, email, telefono, created_by)
SELECT
  'Mantenimientos Del Norte Ltda',
  '800987654-2',
  'info@mantnorte.com',
  '6041234567',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.proveedores WHERE nit = '800987654-2'
);
