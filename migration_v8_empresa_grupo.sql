-- ══════════════════════════════════════════════════════════════════
-- migration_v8_empresa_grupo.sql
-- Agrega campo empresa_grupo a profiles y proveedores
-- para separar datos entre Riopaila y Castilla
-- ══════════════════════════════════════════════════════════════════

-- 1. Columna en proveedores (obligatoria, default 'castilla' para registros existentes)
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS empresa_grupo TEXT
    NOT NULL DEFAULT 'castilla'
    CHECK (empresa_grupo IN ('riopaila', 'castilla'));

-- 2. Columna en profiles (nullable: null = admin que ve todo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_grupo TEXT
    CHECK (empresa_grupo IN ('riopaila', 'castilla'));

-- 3. Índice para búsquedas frecuentes por tenant
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_grupo
  ON public.proveedores(empresa_grupo);

CREATE INDEX IF NOT EXISTS idx_profiles_empresa_grupo
  ON public.profiles(empresa_grupo);

-- ── Verificación ──────────────────────────────────────────────────
SELECT
  'proveedores' AS tabla,
  COUNT(*) AS total,
  COUNT(CASE WHEN empresa_grupo = 'castilla'  THEN 1 END) AS castilla,
  COUNT(CASE WHEN empresa_grupo = 'riopaila'  THEN 1 END) AS riopaila
FROM public.proveedores

UNION ALL

SELECT
  'profiles',
  COUNT(*),
  COUNT(CASE WHEN empresa_grupo = 'castilla'  THEN 1 END),
  COUNT(CASE WHEN empresa_grupo = 'riopaila'  THEN 1 END)
FROM public.profiles;
