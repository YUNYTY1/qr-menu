-- UNDERTY MENU · 003 · Triggers de reglas y funciones RPC

-- Solo el superadmin puede cambiar la dirección pública (slug)
create or replace function public.guard_restaurant_update() returns trigger
language plpgsql as $$
begin
  if not public.is_superadmin() and new.slug is distinct from old.slug then
    raise exception 'Solo Grupo Underty puede cambiar la dirección pública del menú';
  end if;
  return new;
end $$;
create trigger restaurants_guard before update on public.restaurants
  for each row execute function public.guard_restaurant_update();

-- Límite de productos según el plan
create or replace function public.enforce_product_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare mx int; cnt int;
begin
  if public.is_superadmin() or auth.uid() is null then return new; end if;
  mx := coalesce((public.plan_limits(new.restaurant_id)->>'max_products')::int, 30);
  if mx >= 0 then
    select count(*) into cnt from public.products where restaurant_id = new.restaurant_id;
    if cnt >= mx then
      raise exception 'Tu plan permite hasta % productos. Actualiza tu plan para agregar más.', mx;
    end if;
  end if;
  return new;
end $$;
create trigger products_limit before insert on public.products
  for each row execute function public.enforce_product_limit();

-- Límite de sucursales según el plan
create or replace function public.enforce_branch_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare mx int; cnt int;
begin
  if public.is_superadmin() or auth.uid() is null then return new; end if;
  mx := coalesce((public.plan_limits(new.restaurant_id)->>'max_branches')::int, 1);
  if mx >= 0 then
    select count(*) into cnt from public.branches where restaurant_id = new.restaurant_id;
    if cnt >= mx then
      raise exception 'Tu plan permite hasta % sucursal(es).', mx;
    end if;
  end if;
  return new;
end $$;
create trigger branches_limit before insert on public.branches
  for each row execute function public.enforce_branch_limit();

-- Promociones: solo si el plan las incluye
create or replace function public.enforce_promotions_feature() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_superadmin() or auth.uid() is null then return new; end if;
  if not coalesce((public.plan_limits(new.restaurant_id)->>'promotions')::boolean, false) then
    raise exception 'Tu plan no incluye promociones.';
  end if;
  return new;
end $$;
create trigger promotions_feature before insert on public.promotions
  for each row execute function public.enforce_promotions_feature();

-- Personalización avanzada: solo si el plan la incluye
create or replace function public.enforce_theme_feature() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_superadmin() or auth.uid() is null then return new; end if;
  if not coalesce((public.plan_limits(new.restaurant_id)->>'advanced_theme')::boolean, false) then
    if (new.template, new.font, new.card_style, new.layout, new.secondary_color, new.button_color)
       is distinct from (old.template, old.font, old.card_style, old.layout, old.secondary_color, old.button_color) then
      raise exception 'Tu plan no incluye personalización avanzada.';
    end if;
  end if;
  return new;
end $$;
create trigger themes_feature before update on public.restaurant_themes
  for each row execute function public.enforce_theme_feature();

-- Crear restaurante (atómico): restaurante + tema + suscripción pendiente
create or replace function public.create_restaurant(
  p_name text, p_slug text, p_plan uuid,
  p_whatsapp text default null, p_phone text default null, p_address text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not public.is_superadmin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  insert into public.restaurants (name, slug, whatsapp, phone, address)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_whatsapp),''), nullif(trim(p_phone),''), nullif(trim(p_address),''))
  returning id into rid;
  insert into public.restaurant_themes (restaurant_id) values (rid);
  insert into public.subscriptions (restaurant_id, plan_id, status) values (rid, p_plan, 'pendiente');
  return rid;
end $$;

-- Renovar suscripción y registrar el pago
create or replace function public.renew_subscription(
  p_subscription uuid, p_months int, p_amount numeric default null,
  p_method text default null, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare s public.subscriptions%rowtype; today date := public.today_lima(); base date;
begin
  if not public.is_superadmin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_months is null or p_months < 1 or p_months > 36 then raise exception 'Meses inválidos (1 a 36)'; end if;
  select * into s from public.subscriptions where id = p_subscription for update;
  if not found then raise exception 'Suscripción no encontrada'; end if;
  base := greatest(today, coalesce(s.end_date, today));
  update public.subscriptions set
    start_date = case when s.start_date is null or s.end_date is null or s.end_date < today then today else s.start_date end,
    end_date = (base + make_interval(months => p_months))::date,
    status = 'activo'
  where id = s.id;
  if p_amount is not null and p_amount > 0 then
    insert into public.subscription_payments (subscription_id, restaurant_id, amount, type, method, note, paid_at)
    values (s.id, s.restaurant_id, p_amount, 'mensualidad', p_method, p_note, today);
  end if;
end $$;

-- Marcar como vencidas las suscripciones activas con fecha pasada
create or replace function public.refresh_subscription_status() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_superadmin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  update public.subscriptions set status = 'vencido'
  where status = 'activo' and end_date is not null and end_date < public.today_lima();
  get diagnostics n = row_count;
  return n;
end $$;

-- Estadísticas generales de la plataforma
create or replace function public.get_platform_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t date := public.today_lima(); res jsonb;
begin
  if not public.is_superadmin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  with eff as (
    select s.restaurant_id, r.name, r.slug, s.end_date,
           case when s.status = 'activo' and s.end_date is not null and s.end_date < t
                then 'vencido' else s.status::text end as st
    from public.subscriptions s join public.restaurants r on r.id = s.restaurant_id)
  select jsonb_build_object(
    'total', (select count(*) from public.restaurants),
    'activos', (select count(*) from eff where st = 'activo'),
    'pendientes', (select count(*) from eff where st = 'pendiente'),
    'vencidos', (select count(*) from eff where st = 'vencido'),
    'suspendidos', (select count(*) from eff where st = 'suspendido'),
    'cancelados', (select count(*) from eff where st = 'cancelado'),
    'ingresos_total', (select coalesce(sum(amount),0) from public.subscription_payments),
    'ingresos_mes', (select coalesce(sum(amount),0) from public.subscription_payments
                     where paid_at >= date_trunc('month', t::timestamp)::date),
    'proximos', (select coalesce(jsonb_agg(jsonb_build_object(
                    'restaurant_id', restaurant_id, 'name', name, 'slug', slug,
                    'end_date', end_date, 'days_left', end_date - t) order by end_date), '[]'::jsonb)
                 from eff where st = 'activo' and end_date between t and t + 15)
  ) into res;
  return res;
end $$;

-- Menú público (único punto de lectura anónima)
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
      'logo_url', r.logo_url, 'cover_url', r.cover_url, 'hours', r.hours, 'socials', r.socials),
    'theme', (select to_jsonb(th) - 'updated_at' from public.restaurant_themes th where th.restaurant_id = r.id),
    'branches', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at)
                from public.branches b where b.restaurant_id = r.id and b.is_active), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.created_at)
                from public.categories c where c.restaurant_id = r.id and c.is_visible), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort_order, p.created_at)
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

-- Registrar visita (anónimo). Solo si el menú está disponible.
create or replace function public.track_visit(
  p_slug text, p_category uuid default null, p_product uuid default null, p_branch uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare rid uuid; st public.subscription_status;
begin
  select id into rid from public.restaurants where slug = lower(p_slug);
  if rid is null then return; end if;
  st := coalesce(public.effective_status(rid), 'pendiente');
  if st not in ('activo','pendiente') then return; end if;
  insert into public.menu_visits (restaurant_id, category_id, product_id, branch_id)
  values (rid,
    (select id from public.categories where id = p_category and restaurant_id = rid),
    (select id from public.products where id = p_product and restaurant_id = rid),
    (select id from public.branches where id = p_branch and restaurant_id = rid));
end $$;

-- Estadísticas de un restaurante
create or replace function public.get_restaurant_stats(p_restaurant uuid, p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t date := public.today_lima(); since date; lim jsonb; branch_ok boolean;
begin
  if not public.has_restaurant_access(p_restaurant) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  lim := public.plan_limits(p_restaurant);
  if not public.is_superadmin() and not coalesce((lim->>'stats')::boolean, false) then
    raise exception 'Tu plan no incluye estadísticas.';
  end if;
  branch_ok := public.is_superadmin() or coalesce((lim->>'branch_stats')::boolean, false);
  p_days := least(greatest(coalesce(p_days, 30), 1), 365);
  since := t - (p_days - 1);
  return jsonb_build_object(
    'days', p_days,
    'total', (select count(*) from public.menu_visits mv
              where mv.restaurant_id = p_restaurant and mv.branch_id is null and mv.category_id is null
                and mv.product_id is null and (mv.created_at at time zone 'America/Lima')::date >= since),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('date', since + g.i, 'visits', coalesce(v.c, 0)) order by g.i), '[]'::jsonb)
               from generate_series(0, p_days - 1) as g(i)
               left join (select (mv.created_at at time zone 'America/Lima')::date as d, count(*) as c
                          from public.menu_visits mv
                          where mv.restaurant_id = p_restaurant and mv.branch_id is null
                            and mv.category_id is null and mv.product_id is null
                          group by 1) v on v.d = since + g.i),
    'top_categories', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select c.name, count(*) as visits from public.menu_visits mv
        join public.categories c on c.id = mv.category_id
        where mv.restaurant_id = p_restaurant and mv.product_id is null
          and (mv.created_at at time zone 'America/Lima')::date >= since
        group by c.name order by count(*) desc limit 5) x),
    'top_products', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select p.name, count(*) as visits from public.menu_visits mv
        join public.products p on p.id = mv.product_id
        where mv.restaurant_id = p_restaurant
          and (mv.created_at at time zone 'America/Lima')::date >= since
        group by p.name order by count(*) desc limit 8) x),
    'by_branch', case when branch_ok then (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select b.name, count(*) as visits from public.menu_visits mv
        join public.branches b on b.id = mv.branch_id
        where mv.restaurant_id = p_restaurant
          and (mv.created_at at time zone 'America/Lima')::date >= since
        group by b.name order by count(*) desc) x) else '[]'::jsonb end,
    'branch_stats_enabled', branch_ok
  );
end $$;

-- Permisos de ejecución: nada para anónimos salvo el menú público
revoke all on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.get_public_menu(text) to anon, authenticated;
grant execute on function public.track_visit(text, uuid, uuid, uuid) to anon, authenticated;
