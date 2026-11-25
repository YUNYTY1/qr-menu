-- UNDERTY MENU · 009 · Datos públicos extra del restaurante y horarios estructurados
--
-- Qué hace (solo agrega, no modifica ni borra datos existentes):
--  1) Agrega 5 columnas a public.restaurants:
--       cuisine        tipo de comida        (ej. "Comida colombiana")  opcional
--       city           ciudad                (ej. "Ibagué")             opcional
--       delivery_time  tiempo de entrega     (ej. "35-40 min")          opcional
--       timezone       zona horaria          (por defecto America/Lima)
--       schedule       horarios estructurados, lista de franjas:
--                      [{"days":[1,2,3,4,5],"open":"12:00","close":"22:00"}]
--                      days: 0 = domingo ... 6 = sábado (igual que getDay() de JavaScript)
--     La columna "hours" (texto libre) NO se toca: sigue mostrándose igual.
--  2) Reemplaza get_public_menu con la versión que corre hoy en la base (verificada con
--     pg_get_functiondef), agregando solo esos 5 campos al objeto "restaurant".
--
-- Se usa "add column" SIN "if not exists" a propósito: si alguna columna ya existiera,
-- el script falla y no cambia nada (el editor ejecuta todo como una sola transacción).

alter table public.restaurants
  add column cuisine text check (char_length(cuisine) <= 60),
  add column city text check (char_length(city) <= 60),
  add column delivery_time text check (char_length(delivery_time) <= 20),
  add column timezone text not null default 'America/Lima',
  add column schedule jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array');

create or replace function public.get_public_menu(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.restaurants%rowtype; st public.subscription_status; t date := public.today_lima();
begin
  select * into r from public.restaurants where slug = lower(p_slug);
  if not found then return null; end if;
  st := coalesce(public.effective_status(r.id), 'pendiente');
  if st not in ('activo','pendiente') then
    return jsonb_build_object('available', false, 'status', st,
      'restaurant', jsonb_build_object('name', r.name, 'logo_url', r.logo_url));
  end if;
  return jsonb_build_object(
    'available', true, 'status', st,
    'restaurant', jsonb_build_object('id', r.id, 'slug', r.slug, 'name', r.name, 'description', r.description,
      'address', r.address, 'phone', r.phone, 'whatsapp', r.whatsapp, 'currency', r.currency,
      'logo_url', r.logo_url, 'cover_url', r.cover_url, 'hours', r.hours, 'socials', r.socials,
      'cuisine', r.cuisine, 'city', r.city, 'delivery_time', r.delivery_time,
      'timezone', r.timezone, 'schedule', r.schedule),
    'theme', (select to_jsonb(th) - 'updated_at' from public.restaurant_themes th where th.restaurant_id = r.id),
    'branches', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at)
                from public.branches b where b.restaurant_id = r.id and b.is_active), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.created_at)
                from public.categories c where c.restaurant_id = r.id and c.is_visible), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(
                to_jsonb(p) || jsonb_build_object('unavailable_branch_ids', coalesce(p.unavailable_branch_ids, '{}'::uuid[]))
                order by p.sort_order, p.created_at)
                from public.products p
                where p.restaurant_id = r.id and p.is_published
                  and exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible)), '[]'::jsonb),
    'promotions', case when coalesce((public.plan_limits(r.id)->>'promotions')::boolean, false)
                then coalesce((select jsonb_agg(to_jsonb(pr) order by pr.created_at desc)
                  from public.promotions pr
                  where pr.restaurant_id = r.id and pr.is_active
                    and (pr.starts_at is null or pr.starts_at <= t)
                    and (pr.ends_at is null or pr.ends_at >= t)), '[]'::jsonb)
                else '[]'::jsonb end
  );
end $$;

-- create or replace conserva los permisos; se reafirman por seguridad (es idempotente)
grant execute on function public.get_public_menu(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------
-- ROLLBACK (solo si algo sale mal). Orden importante: primero la función, luego las columnas.
-- ---------------------------------------------------------------------------------------------
-- create or replace function public.get_public_menu(p_slug text) returns jsonb
-- language plpgsql stable security definer set search_path = public as $fn$
-- declare r public.restaurants%rowtype; st public.subscription_status; t date := public.today_lima();
-- begin
--   select * into r from public.restaurants where slug = lower(p_slug);
--   if not found then return null; end if;
--   st := coalesce(public.effective_status(r.id), 'pendiente');
--   if st not in ('activo','pendiente') then
--     return jsonb_build_object('available', false, 'status', st,
--       'restaurant', jsonb_build_object('name', r.name, 'logo_url', r.logo_url));
--   end if;
--   return jsonb_build_object(
--     'available', true, 'status', st,
--     'restaurant', jsonb_build_object('id', r.id, 'slug', r.slug, 'name', r.name, 'description', r.description,
--       'address', r.address, 'phone', r.phone, 'whatsapp', r.whatsapp, 'currency', r.currency,
--       'logo_url', r.logo_url, 'cover_url', r.cover_url, 'hours', r.hours, 'socials', r.socials),
--     'theme', (select to_jsonb(th) - 'updated_at' from public.restaurant_themes th where th.restaurant_id = r.id),
--     'branches', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at)
--                 from public.branches b where b.restaurant_id = r.id and b.is_active), '[]'::jsonb),
--     'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.created_at)
--                 from public.categories c where c.restaurant_id = r.id and c.is_visible), '[]'::jsonb),
--     'products', coalesce((select jsonb_agg(
--                 to_jsonb(p) || jsonb_build_object('unavailable_branch_ids', coalesce(p.unavailable_branch_ids, '{}'::uuid[]))
--                 order by p.sort_order, p.created_at)
--                 from public.products p
--                 where p.restaurant_id = r.id and p.is_published
--                   and exists (select 1 from public.categories c where c.id = p.category_id and c.is_visible)), '[]'::jsonb),
--     'promotions', case when coalesce((public.plan_limits(r.id)->>'promotions')::boolean, false)
--                 then coalesce((select jsonb_agg(to_jsonb(pr) order by pr.created_at desc)
--                   from public.promotions pr
--                   where pr.restaurant_id = r.id and pr.is_active
--                     and (pr.starts_at is null or pr.starts_at <= t)
--                     and (pr.ends_at is null or pr.ends_at >= t)), '[]'::jsonb)
--                 else '[]'::jsonb end
--   );
-- end $fn$;
-- alter table public.restaurants
--   drop column cuisine, drop column city, drop column delivery_time, drop column timezone, drop column schedule;
-- notify pgrst, 'reload schema';