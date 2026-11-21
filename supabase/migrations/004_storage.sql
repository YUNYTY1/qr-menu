-- UNDERTY MENU · 004 · Storage (imágenes de restaurantes)
-- Bucket público de lectura (las imágenes del menú son públicas) con escritura
-- restringida a la carpeta {restaurant_id}/ del restaurante autorizado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-assets', 'restaurant-assets', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create or replace function public.storage_restaurant_id(object_name text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.storage_restaurant_id(text) to authenticated;

create policy "assets_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'restaurant-assets' and public.restaurant_can_write(public.storage_restaurant_id(name)));
create policy "assets_update" on storage.objects for update to authenticated
  using (bucket_id = 'restaurant-assets' and public.restaurant_can_write(public.storage_restaurant_id(name)));
create policy "assets_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'restaurant-assets' and public.restaurant_can_write(public.storage_restaurant_id(name)));
