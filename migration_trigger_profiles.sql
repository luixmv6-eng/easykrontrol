-- ══════════════════════════════════════════════════════
-- EASY KONTROL — Trigger: auto-crear perfil al crear usuario
-- Ejecutar en: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════════
--
-- Sin este trigger, public.profiles solo se llena cuando el
-- usuario inicia sesión. Con él, el perfil existe desde el
-- momento en que el admin crea el usuario en Supabase Auth,
-- permitiendo vincularlo a una empresa sin que inicie sesión.
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'proveedor'
  )
  ON CONFLICT DO NOTHING;  -- no especifica columna: funciona con cualquier constraint
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
