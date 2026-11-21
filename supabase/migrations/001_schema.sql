-- UNDERTY MENU · 001 · Esquema de base de datos
-- Ejecutar en orden: 001 → 002 → 003 → 004 → 005 → 006

create type public.subscription_status as enum ('activo','pendiente','vencido','suspendido','cancelado');
create type public.member_role as enum ('owner','editor');
create type public.payment_type as enum ('configuracion','mensualidad','otro');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- Perfiles (1 a 1 con auth.users) -------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Planes ---------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]{2,30}$'),
  name text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  setup_fee numeric(10,2) not null default 0 check (setup_fee >= 0),
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_updated before update on public.plans for each row execute function public.set_updated_at();

-- Restaurantes ---------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
    check (slug not in ('www','app','admin','api','panel','superadmin','login','m','mail','static')),
  name text not null check (char_length(name) between 2 and 120),
  description text check (char_length(description) <= 500),
  address text,
  phone text,
  whatsapp text,
  currency text not null default 'S/' check (char_length(currency) between 1 and 5),
  logo_url text,
  cover_url text,
  hours jsonb not null default '[]'::jsonb,
  socials jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger restaurants_updated before update on public.restaurants for each row execute function public.set_updated_at();

create table public.restaurant_users (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_users_user_idx on public.restaurant_users(user_id);

-- Suscripciones --------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'pendiente',
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.set_updated_at();

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  type public.payment_type not null default 'mensualidad',
  method text,
  note text,
  paid_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index payments_restaurant_idx on public.subscription_payments(restaurant_id, paid_at desc);

-- Sucursales -----------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  address text,
  phone text,
  whatsapp text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index branches_restaurant_idx on public.branches(restaurant_id);
create trigger branches_updated before update on public.branches for each row execute function public.set_updated_at();

-- Categorías y productos -----------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  image_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index categories_restaurant_idx on public.categories(restaurant_id, sort_order);
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 600),
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- la categoría debe pertenecer al MISMO restaurante
  constraint products_category_fk foreign key (category_id, restaurant_id)
    references public.categories(id, restaurant_id) on delete restrict
);
create index products_restaurant_idx on public.products(restaurant_id, category_id, sort_order);
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

-- Tema visual ----------------------------------------------------------------
create table public.restaurant_themes (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  template text not null default 'clasico' check (template in ('clasico','moderno','oscuro','elegante')),
  primary_color text not null default '#ea580c' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#fff7ed' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  button_color text not null default '#ea580c' check (button_color ~ '^#[0-9a-fA-F]{6}$'),
  font text not null default 'Inter' check (font in ('Inter','Poppins','Montserrat','Playfair Display','Lora')),
  card_style text not null default 'redondeada' check (card_style in ('redondeada','plana','sombra')),
  layout text not null default 'cuadricula' check (layout in ('cuadricula','lista','grande')),
  updated_at timestamptz not null default now()
);
create trigger themes_updated before update on public.restaurant_themes for each row execute function public.set_updated_at();

-- Promociones ----------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 400),
  image_url text,
  starts_at date,
  ends_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);
create index promotions_restaurant_idx on public.promotions(restaurant_id);
create trigger promotions_updated before update on public.promotions for each row execute function public.set_updated_at();

-- Visitas --------------------------------------------------------------------
-- Vista de menú: branch/category/product nulos. Vista de categoría: category_id.
-- Vista de producto: product_id. Selección de sucursal: branch_id.
create table public.menu_visits (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index menu_visits_restaurant_idx on public.menu_visits(restaurant_id, created_at desc);
