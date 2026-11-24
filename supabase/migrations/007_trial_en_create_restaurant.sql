-- UNDERTY MENU · 007 · create_restaurant asigna la prueba gratis
--
-- create_my_restaurant ya aplicaba la prueba (billing_settings.trial_days).
-- create_restaurant (el botón "Nuevo restaurante" de Grupo Underty) creaba la suscripción sin fechas.
-- Ahora usa la misma regla. p_trial = false conserva el comportamiento anterior (sin fechas).

-- 1) Elimina TODAS las versiones existentes de create_restaurant
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_restaurant'
  loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

-- 2) Nueva versión
create or replace function public.create_restaurant(
  p_name text, p_slug text, p_plan uuid,
  p_whatsapp text default null, p_phone text default null, p_address text default null,
  p_trial boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  rid uuid;
  trial int;
  days int := 0;
  today date := public.today_lima();
begin
  if not public.is_superadmin() then raise exception 'No autorizado' using errcode = '42501'; end if;

  if p_trial then
    select trial_days into trial from public.billing_settings where id = 1;
    days := coalesce(trial, 7);
  end if;

  insert into public.restaurants (name, slug, whatsapp, phone, address)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_whatsapp),''), nullif(trim(p_phone),''), nullif(trim(p_address),''))
  returning id into rid;

  insert into public.restaurant_themes (restaurant_id) values (rid);

  insert into public.subscriptions (restaurant_id, plan_id, status, start_date, end_date)
  values (
    rid, p_plan, 'pendiente',
    case when days > 0 then today end,
    case when days > 0 then today + days end
  );

  return rid;
end $$;

-- 3) Permisos
revoke all on function public.create_restaurant(text, text, uuid, text, text, text, boolean) from public, anon;
grant execute on function public.create_restaurant(text, text, uuid, text, text, text, boolean) to authenticated;

-- 4) Refresca la caché de la API
notify pgrst, 'reload schema';