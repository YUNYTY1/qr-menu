-- UNDERTY MENU · Pruebas de aislamiento y permisos
-- Ejecutar en Supabase > SQL Editor DESPUÉS de las migraciones. Todo se revierte al final (ROLLBACK).
-- Cada prueba imprime "OK" o lanza "FALLO". Revisa la pestaña Messages/Results.

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-a@underty.test','{}',now(),now()),
 ('bbbbbbbb-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-b@underty.test','{}',now(),now()),
 ('cccccccc-0000-0000-0000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','test-super@underty.test','{}',now(),now());
update public.profiles set is_superadmin = true where id = 'cccccccc-0000-0000-0000-00000000000c';

insert into public.plans (id, code, name, limits) values
 ('99999999-0000-0000-0000-000000000001','test-starter','Test Starter',
  '{"max_products":30,"max_branches":1,"advanced_theme":false,"promotions":false,"stats":false,"branch_stats":false}');

insert into public.restaurants (id, slug, name) values
 ('a1a1a1a1-0000-0000-0000-000000000001','test-a','Restaurante A'),
 ('b2b2b2b2-0000-0000-0000-000000000002','test-b','Restaurante B');
insert into public.restaurant_themes (restaurant_id) values
 ('a1a1a1a1-0000-0000-0000-000000000001'),('b2b2b2b2-0000-0000-0000-000000000002');
insert into public.subscriptions (id, restaurant_id, plan_id, status, start_date, end_date) values
 ('51515151-0000-0000-0000-000000000001','a1a1a1a1-0000-0000-0000-000000000001','99999999-0000-0000-0000-000000000001','activo', current_date, current_date + 30),
 ('52525252-0000-0000-0000-000000000002','b2b2b2b2-0000-0000-0000-000000000002','99999999-0000-0000-0000-000000000001','activo', current_date, current_date + 30);
insert into public.restaurant_users (restaurant_id, user_id) values
 ('a1a1a1a1-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-00000000000a'),
 ('b2b2b2b2-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-00000000000b');
insert into public.categories (id, restaurant_id, name) values
 ('ca000000-0000-0000-0000-00000000000a','a1a1a1a1-0000-0000-0000-000000000001','Cat A'),
 ('cb000000-0000-0000-0000-00000000000b','b2b2b2b2-0000-0000-0000-000000000002','Cat B');
insert into public.products (id, restaurant_id, category_id, name, price) values
 ('da000000-0000-0000-0000-00000000000a','a1a1a1a1-0000-0000-0000-000000000001','ca000000-0000-0000-0000-00000000000a','Prod A',10),
 ('db000000-0000-0000-0000-00000000000b','b2b2b2b2-0000-0000-0000-000000000002','cb000000-0000-0000-0000-00000000000b','Prod B',10);

-- ===== Sesión: administrador del restaurante A =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$ declare n int; begin
  select count(*) into n from public.restaurants;
  if n <> 1 then raise exception 'FALLO: A ve % restaurantes (esperado 1)', n; end if;
  select count(*) into n from public.products where restaurant_id = 'b2b2b2b2-0000-0000-0000-000000000002';
  if n <> 0 then raise exception 'FALLO: A ve productos de B'; end if;
  select count(*) into n from public.subscriptions where restaurant_id = 'b2b2b2b2-0000-0000-0000-000000000002';
  if n <> 0 then raise exception 'FALLO: A ve la suscripción de B'; end if;
  raise notice 'OK: A solo ve sus propios datos';
end $$;

do $$ declare bad boolean := true; begin
  begin
    insert into public.products (restaurant_id, category_id, name, price)
    values ('b2b2b2b2-0000-0000-0000-000000000002','cb000000-0000-0000-0000-00000000000b','Intruso',1);
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: A pudo insertar un producto en B'; end if;
  raise notice 'OK: A no puede insertar en B';
end $$;

do $$ declare n int; begin
  update public.products set price = 0 where id = 'db000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A modificó un producto de B'; end if;
  delete from public.categories where id = 'cb000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A borró una categoría de B'; end if;
  raise notice 'OK: A no puede modificar ni borrar datos de B';
end $$;

do $$ declare n int; bad boolean := true; begin
  update public.subscriptions set status = 'activo', end_date = current_date + 999 where restaurant_id = 'a1a1a1a1-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A pudo editar su suscripción'; end if;
  update public.profiles set is_superadmin = true where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLO: A pudo hacerse superadmin'; end if;
  begin update public.restaurants set slug = 'hack-a' where id = 'a1a1a1a1-0000-0000-0000-000000000001';
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: A pudo cambiar su slug'; end if;
  raise notice 'OK: A no puede tocar suscripción, rol ni slug';
end $$;

do $$ declare bad boolean := true; begin
  begin perform public.create_restaurant('Hack','hack-x','99999999-0000-0000-0000-000000000001');
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: A pudo crear un restaurante'; end if;
  bad := true;
  begin perform public.get_restaurant_stats('b2b2b2b2-0000-0000-0000-000000000002', 30);
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: A leyó estadísticas de B'; end if;
  raise notice 'OK: A no puede usar funciones de superadmin ni ver stats de B';
end $$;

do $$ declare bad boolean := true; i int; begin
  for i in 1..29 loop
    insert into public.products (restaurant_id, category_id, name, price)
    values ('a1a1a1a1-0000-0000-0000-000000000001','ca000000-0000-0000-0000-00000000000a','P'||i,5);
  end loop;
  begin
    insert into public.products (restaurant_id, category_id, name, price)
    values ('a1a1a1a1-0000-0000-0000-000000000001','ca000000-0000-0000-0000-00000000000a','Producto 31',5);
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: se superó el límite del plan Starter'; end if;
  raise notice 'OK: el límite de 30 productos se respeta';
end $$;

do $$ declare bad boolean := true; begin
  begin
    insert into public.products (restaurant_id, category_id, name, price)
    values ('a1a1a1a1-0000-0000-0000-000000000001','cb000000-0000-0000-0000-00000000000b','Cruzado',5);
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: producto de A con categoría de B'; end if;
  raise notice 'OK: no se mezclan categorías entre restaurantes';
end $$;

-- ===== Sesión: superadmin =====
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$ declare n int; begin
  select count(*) into n from public.restaurants where slug in ('test-a','test-b');
  if n <> 2 then raise exception 'FALLO: el superadmin no ve todos los restaurantes'; end if;
  update public.subscriptions set status = 'suspendido' where restaurant_id = 'a1a1a1a1-0000-0000-0000-000000000001';
  raise notice 'OK: el superadmin ve todo y suspende a A';
end $$;

-- ===== A suspendido: solo lectura, menú no disponible, datos intactos =====
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$ declare bad boolean := true; n int; begin
  begin
    insert into public.categories (restaurant_id, name) values ('a1a1a1a1-0000-0000-0000-000000000001','No debería');
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: A suspendido pudo escribir'; end if;
  select count(*) into n from public.products where restaurant_id = 'a1a1a1a1-0000-0000-0000-000000000001';
  if n = 0 then raise exception 'FALLO: los datos de A desaparecieron al suspender'; end if;
  raise notice 'OK: A suspendido queda en solo lectura y conserva sus % productos', n;
end $$;

-- ===== Anónimo =====
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ declare bad boolean := true; m jsonb; begin
  begin perform count(*) from public.products;
  exception when others then bad := false; end;
  if bad then raise exception 'FALLO: anon puede leer products directamente'; end if;
  m := public.get_public_menu('test-a');
  if (m->>'available')::boolean then raise exception 'FALLO: menú suspendido sigue visible'; end if;
  m := public.get_public_menu('test-b');
  if not (m->>'available')::boolean then raise exception 'FALLO: menú activo no disponible'; end if;
  raise notice 'OK: anon solo accede por get_public_menu; suspendido muestra aviso';
end $$;

reset role;
rollback;
