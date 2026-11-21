-- UNDERTY MENU · 002 · Funciones auxiliares y políticas RLS

create or replace function public.today_lima() returns date
language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_superadmin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.has_restaurant_access(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or exists (
    select 1 from public.restaurant_users ru where ru.restaurant_id = rid and ru.user_id = auth.uid());
$$;

-- Estado real de la suscripción (activo con fecha vencida => vencido)
create or replace function public.effective_status(rid uuid) returns public.subscription_status
language sql stable security definer set search_path = public as $$
  select case when s.status = 'activo' and s.end_date is not null and s.end_date < public.today_lima()
              then 'vencido'::public.subscription_status else s.status end
  from public.subscriptions s where s.restaurant_id = rid;
$$;

-- Solo se puede editar con suscripción activa o pendiente (vencida/suspendida = solo lectura)
create or replace function public.restaurant_can_write(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or (
    public.has_restaurant_access(rid)
    and coalesce(public.effective_status(rid), 'pendiente') in ('activo','pendiente'));
$$;

create or replace function public.plan_limits(rid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select p.limits from public.subscriptions s join public.plans p on p.id = s.plan_id
                   where s.restaurant_id = rid), '{}'::jsonb);
$$;

-- Sin acceso directo para usuarios anónimos
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Activar RLS en TODAS las tablas
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.branches enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.restaurant_themes enable row level security;
alter table public.promotions enable row level security;
alter table public.menu_visits enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_superadmin());
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- plans
create policy plans_select on public.plans for select to authenticated using (true);
create policy plans_write on public.plans for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- restaurants
create policy restaurants_select on public.restaurants for select to authenticated
  using (public.has_restaurant_access(id));
create policy restaurants_insert on public.restaurants for insert to authenticated
  with check (public.is_superadmin());
create policy restaurants_update on public.restaurants for update to authenticated
  using (public.restaurant_can_write(id)) with check (public.restaurant_can_write(id));
create policy restaurants_delete on public.restaurants for delete to authenticated
  using (public.is_superadmin());

-- restaurant_users
create policy ru_select on public.restaurant_users for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin());
create policy ru_write on public.restaurant_users for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- subscriptions y pagos: lectura para el restaurante, escritura solo superadmin
create policy subs_select on public.subscriptions for select to authenticated
  using (public.has_restaurant_access(restaurant_id));
create policy subs_write on public.subscriptions for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy pay_select on public.subscription_payments for select to authenticated
  using (public.has_restaurant_access(restaurant_id));
create policy pay_write on public.subscription_payments for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- Tablas del restaurante: leer si tiene acceso, escribir si puede escribir
do $$
declare t text;
begin
  foreach t in array array['branches','categories','products','restaurant_themes','promotions']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_restaurant_access(restaurant_id))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.restaurant_can_write(restaurant_id))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.restaurant_can_write(restaurant_id)) with check (public.restaurant_can_write(restaurant_id))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.restaurant_can_write(restaurant_id))', t||'_delete', t);
  end loop;
end $$;

-- menu_visits: solo lectura (la escritura es por la función track_visit)
create policy visits_select on public.menu_visits for select to authenticated
  using (public.has_restaurant_access(restaurant_id));
