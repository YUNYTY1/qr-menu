-- 013_has_password.sql
-- Permite saber (desde el cliente) si el usuario autenticado ya tiene contraseña.
-- Los usuarios que entran solo con Google o solo con código no la tienen.

create or replace function public.has_password()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(
    (
      select coalesce(encrypted_password, '') <> ''
      from auth.users
      where id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.has_password() from public;
revoke all on function public.has_password() from anon;
grant execute on function public.has_password() to authenticated;

-- Verificación opcional (ejecútala en el SQL Editor):
-- select email, (coalesce(encrypted_password, '') <> '') as tiene_password
-- from auth.users
-- order by created_at desc;