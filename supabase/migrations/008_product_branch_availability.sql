-- 1. Agregar arreglo de sucursales donde el producto NO está disponible
--    Por defecto '{}' = disponible en todas las sucursales (respetando is_available general)
alter table public.products
  add column if not exists unavailable_branch_ids uuid[] not null default '{}';

-- 2. Actualizar get_public_menu para asegurar que cada producto exponga unavailable_branch_ids
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

-- Mantener permisos de ejecución intactos
grant execute on function public.get_public_menu(text) to anon, authenticated;