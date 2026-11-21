-- UNDERTY MENU · 006 · Primer superadministrador
-- 1) Crea tu usuario en Supabase: Authentication > Users > Add user (marca "Auto Confirm User").
-- 2) Cambia el correo y ejecuta:

update public.profiles set is_superadmin = true where email = 'TU_CORREO@dominio.com';
