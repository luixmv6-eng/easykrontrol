-- ══════════════════════════════════════════════════════
-- EASY KONTROL — Migración v5
-- Formularios F-P-ECC-001-01, 001-02, 001-05
-- Ejecutar en Supabase SQL Editor DESPUÉS de migration_v4.sql
-- ══════════════════════════════════════════════════════

-- ── 1. Nuevos campos en tabla personal ───────────────
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS actividad_a_realizar TEXT,
  ADD COLUMN IF NOT EXISTS cargo               TEXT,
  ADD COLUMN IF NOT EXISTS municipio_residencia TEXT,
  ADD COLUMN IF NOT EXISTS arl                TEXT,
  ADD COLUMN IF NOT EXISTS eps                TEXT,
  ADD COLUMN IF NOT EXISTS afp                TEXT;

-- ── 2. Constraint actividad_a_realizar ───────────────
ALTER TABLE public.personal
  DROP CONSTRAINT IF EXISTS chk_actividad_a_realizar;

ALTER TABLE public.personal
  ADD CONSTRAINT chk_actividad_a_realizar
  CHECK (actividad_a_realizar IS NULL OR actividad_a_realizar IN (
    'Asesoría Administrativa',
    'Asesoría Legal',
    'Asesoría Operativa',
    'Bioestimulación Terrestre',
    'Comercial',
    'Control Químico',
    'Corte y Siembra',
    'Descarga de materiales (materia prima y/o insumos)',
    'Labores de Ganadería',
    'Labores de Mantenimiento',
    'Labores Manuales',
    'Labores Mecanizadas',
    'Labores Metalmecánico',
    'Labores Obra Civil',
    'Labores Propias del Cargo (Empleado)',
    'Muestreo de Suelos',
    'Reparación Mecánica',
    'Seguridad Física',
    'Servicio de Topografía',
    'Servicios Eléctricos',
    'Transporte de Combustible',
    'Transporte de Mercancías Peligrosas',
    'Transporte de Semilla',
    'Transporte material, sedimentos, tierra',
    'Visita al Poliducto',
    'Visita Empresarial'
  ));

-- ── 3. Nuevos campos en tabla vehiculos ──────────────
ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS color                       TEXT,
  ADD COLUMN IF NOT EXISTS categoria_licencia          TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_licencia  DATE;

-- ── 4. Constraint categoria_licencia ─────────────────
ALTER TABLE public.vehiculos
  DROP CONSTRAINT IF EXISTS chk_categoria_licencia;

ALTER TABLE public.vehiculos
  ADD CONSTRAINT chk_categoria_licencia
  CHECK (categoria_licencia IS NULL OR categoria_licencia IN (
    'A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'
  ));

-- ── 5. Ampliar tipo de vehículo (sin constraint duro) ─
-- Se elimina el constraint anterior para admitir todos
-- los tipos del catálogo F-P-ECC-001-02
ALTER TABLE public.vehiculos
  DROP CONSTRAINT IF EXISTS vehiculos_tipo_check;
