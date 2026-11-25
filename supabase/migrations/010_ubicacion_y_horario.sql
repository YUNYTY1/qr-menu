-- UNDERTY MENU · 010 · Ubicación exacta en el mapa + comprobación de horario en el servidor
--
-- Qué hace (solo agrega, no modifica ni borra datos existentes):
--  1) Agrega la columna map_location (enlace de Google Maps o coordenadas) a
--     public.restaurants y public.branches. Es opcional: si está vacía, el menú usa la dirección.
--  2) Reemplaza get_public_menu con la versión de la 009, agregando solo 'map_location'
--     al objeto "restaurant". Las sucursales ya viajan completas (to_jsonb(b)), así que
--     su map_location llega solo.
--  3) Crea is_open_now(schedule, timezone, momento) y restaurant_is_open(restaurant_id):
--     misma lógica que el menú (franjas por día, 0 = domingo, horarios que cruzan medianoche).
--     Devuelven NULL si el restaurante no tiene horario configurado (= no se bloquea).
--     OJO: estas funciones todavía NO se usan en la creación de pedidos; ver el mensaje del chat.
--
-- Se usa "add column" SIN "if not exists" a propósito: si ya existiera, el script falla y no cambia nada.

alter table public.restaurants
  add column map_location text check (char_length(map_location) <= 300);

alter table public.branches
  add column map_location text check (char_length(map_location) <= 300);

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
      'timezone', r.timezone, 'schedule', r.schedule, 'map_location', r.map_location),
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

grant execute on function public.get_public_menu(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- ¿Está abierto ahora? true / false, o NULL si no hay horario configurado.
-- days: 0 = domingo ... 6 = sábado. Si open >= close, la franja cruza la medianoche
-- (cuenta para el día en que abre y llega hasta la hora de cierre del día siguiente).
-- ---------------------------------------------------------------------------------------------
create or replace function public.is_open_now(p_schedule jsonb, p_tz text, p_at timestamptz default now())
returns boolean
language plpgsql stable set search_path = public as $$
declare
  local_ts timestamp;
  dow int;
  prev int;
  mins int;
  slot jsonb;
  o int;
  c int;
begin
  if p_schedule is null or jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) = 0 then
    return null;
  end if;

  local_ts := p_at at time zone coalesce(nullif(p_tz, ''), 'America/Lima');
  dow  := extract(dow from local_ts)::int;
  prev := (dow + 6) % 7;
  mins := extract(hour from local_ts)::int * 60 + extract(minute from local_ts)::int;

  for slot in select * from jsonb_array_elements(p_schedule) loop
    o := split_part(slot->>'open', ':', 1)::int * 60 + split_part(slot->>'open', ':', 2)::int;
    c := split_part(slot->>'close', ':', 1)::int * 60 + split_part(slot->>'close', ':', 2)::int;
    if o < c then
      if (slot->'days') @> to_jsonb(dow) and mins >= o and mins < c then return true; end if;
    else
      if (slot->'days') @> to_jsonb(dow) and mins >= o then return true; end if;
      if (slot->'days') @> to_jsonb(prev) and mins < c then return true; end if;
    end if;
  end loop;
  return false;
end $$;

create or replace function public.restaurant_is_open(p_restaurant_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_open_now(r.schedule, r.timezone)
  from public.restaurants r
  where r.id = p_restaurant_id
$$;

grant execute on function public.is_open_now(jsonb, text, timestamptz) to anon, authenticated;
grant execute on function public.restaurant_is_open(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------
-- ROLLBACK (solo si algo sale mal). Orden: 1) volver a ejecutar el "create or replace function
-- get_public_menu" de la migración 009; 2) luego esto:
-- ---------------------------------------------------------------------------------------------
-- drop function if exists public.restaurant_is_open(uuid);
-- drop function if exists public.is_open_now(jsonb, text, timestamptz);
-- alter table public.branches drop column map_location;
-- alter table public.restaurants drop column map_location;
-- notify pgrst, 'reload schema';