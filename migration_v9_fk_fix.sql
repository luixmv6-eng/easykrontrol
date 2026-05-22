-- ══════════════════════════════════════════════════════════════════
-- migration_v9_fk_fix.sql
-- Corrige TODAS las FK sin comportamiento ON DELETE definido
-- Ejecutar en Supabase → SQL Editor → Run (no Explain)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. profiles.proveedor_id → proveedores ────────────────────────
-- Si se elimina un proveedor, el perfil del usuario queda sin empresa
-- (antes requería SET NULL manual en el código — ahora lo hace la BD)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_proveedor_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_proveedor_id_fkey
    FOREIGN KEY (proveedor_id)
    REFERENCES public.proveedores(id)
    ON DELETE SET NULL;

-- ── 2. proveedores.created_by → auth.users ───────────────────────
-- Si se elimina el usuario que creó la empresa, la empresa queda sin creador
ALTER TABLE public.proveedores
  DROP CONSTRAINT IF EXISTS proveedores_created_by_fkey;
ALTER TABLE public.proveedores
  ADD CONSTRAINT proveedores_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── 3. personal.aprobado_por → auth.users ────────────────────────
-- Si se elimina el admin que aprobó el registro, el personal sigue existiendo
ALTER TABLE public.personal
  DROP CONSTRAINT IF EXISTS personal_aprobado_por_fkey;
ALTER TABLE public.personal
  ADD CONSTRAINT personal_aprobado_por_fkey
    FOREIGN KEY (aprobado_por)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── 4. personal.grupo_id → grupos_ingreso ────────────────────────
-- Si se elimina un grupo, el personal que pertenecía a ese grupo
-- queda sin grupo (pero sigue existiendo como registro individual)
ALTER TABLE public.personal
  DROP CONSTRAINT IF EXISTS personal_grupo_id_fkey;
ALTER TABLE public.personal
  ADD CONSTRAINT personal_grupo_id_fkey
    FOREIGN KEY (grupo_id)
    REFERENCES public.grupos_ingreso(id)
    ON DELETE SET NULL;

-- ── 5. personal.vehiculo_id → vehiculos ──────────────────────────
-- Si se elimina un vehículo, el personal queda sin vehículo asignado
ALTER TABLE public.personal
  DROP CONSTRAINT IF EXISTS personal_vehiculo_id_fkey;
ALTER TABLE public.personal
  ADD CONSTRAINT personal_vehiculo_id_fkey
    FOREIGN KEY (vehiculo_id)
    REFERENCES public.vehiculos(id)
    ON DELETE SET NULL;

-- ── 6. grupos_ingreso.creado_por → auth.users ────────────────────
-- Si se elimina el usuario que creó el grupo, el grupo sigue existiendo
ALTER TABLE public.grupos_ingreso
  DROP CONSTRAINT IF EXISTS grupos_ingreso_creado_por_fkey;
ALTER TABLE public.grupos_ingreso
  ADD CONSTRAINT grupos_ingreso_creado_por_fkey
    FOREIGN KEY (creado_por)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── 7. evaluaciones.evaluado_por → auth.users ────────────────────
-- Si se elimina el admin que hizo la evaluación, la evaluación sigue
ALTER TABLE public.evaluaciones
  DROP CONSTRAINT IF EXISTS evaluaciones_evaluado_por_fkey;
ALTER TABLE public.evaluaciones
  ADD CONSTRAINT evaluaciones_evaluado_por_fkey
    FOREIGN KEY (evaluado_por)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── 8. email_logs.personal_id → personal ─────────────────────────
-- CRÍTICO: sin esto, la cascada al borrar proveedores falla porque
-- email_logs bloquea el borrado de personal
ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_personal_id_fkey;
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_personal_id_fkey
    FOREIGN KEY (personal_id)
    REFERENCES public.personal(id)
    ON DELETE SET NULL;

-- ── 9. revisiones_checklist.revisado_por → auth.users ────────────
-- Si se elimina el admin revisor, el checklist sigue existiendo
ALTER TABLE public.revisiones_checklist
  DROP CONSTRAINT IF EXISTS revisiones_checklist_revisado_por_fkey;
ALTER TABLE public.revisiones_checklist
  ADD CONSTRAINT revisiones_checklist_revisado_por_fkey
    FOREIGN KEY (revisado_por)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ── Verificación final ────────────────────────────────────────────
-- Confirma que todas las FK ahora tienen el comportamiento correcto
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name  AS references_table,
  rc.delete_rule  AS on_delete
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'profiles','proveedores','personal',
    'grupos_ingreso','evaluaciones',
    'email_logs','revisiones_checklist'
  )
ORDER BY tc.table_name, kcu.column_name;
