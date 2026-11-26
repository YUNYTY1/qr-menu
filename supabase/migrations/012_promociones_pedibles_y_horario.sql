-- UNDERTY MENU · 012 · Promociones que se pueden pedir + bloqueo de pedidos fuera de horario
--
-- Qué hace:
--  1) Agrega promotions.price (opcional). Con precio, la promoción se puede agregar al pedido;
--     sin precio, solo se muestra (informativa). get_public_menu ya devuelve to_jsonb(promoción),
--     así que el precio llega solo al menú público.
--  2) Crea (o reemplaza, es idempotente) is_open_now / restaurant_is_open, las mismas funciones de la 010,
--     para que esta migración se pueda ejecutar sola.
--  3) Reemplaza create_order con la versión que corre hoy en la base, agregando SOLO:
--       a) rechazo del pedido si el local está cerrado según su horario (si no tiene horario, no bloquea);
--       b) soporte de ítems de tipo promoción: {"id": "...", "qty": 1, "kind": "promo"}.
--          El precio y el nombre se toman SIEMPRE de la tabla promotions (el cliente no puede falsearlos).
--          La promoción debe estar activa, con precio, dentro de sus fechas y el plan debe incluir promociones.
--     Los productos siguen funcionando exactamente igual.
--
-- RECOMENDACIÓN: antes de ejecutar, guarda en un archivo el texto actual de create_order (el que me pasaste),
-- por si necesitas volver atrás: basta con ejecutarlo de nuevo.

alter table public.promotions
  add column price numeric(10,2) check (price is null or price >= 0);

-- ---------------------------------------------------------------------------------------------
-- ¿Está abierto ahora? true / false, o NULL si no hay horario configurado.
-- days: 0 = domingo ... 6 = sábado. Si open >= close, la franja cruza la medianoche.
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

-- ---------------------------------------------------------------------------------------------
-- create_order: versión actual + (a) bloqueo por horario + (b) ítems de promoción
-- ---------------------------------------------------------------------------------------------
create or replace function public.create_order(p_restaurant uuid, p_customer_name text, p_customer_phone text, p_delivery_type text, p_address text, p_reference text, p_latitude double precision, p_longitude double precision, p_payment_method text, p_cash_amount text, p_notes text, p_items jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  st public.subscription_status;
  name_ text := btrim(coalesce(p_customer_name, ''));
  phone_ text := nullif(btrim(coalesce(p_customer_phone, '')), '');
  addr text := nullif(btrim(coalesce(p_address, '')), '');
  ref_ text := nullif(btrim(coalesce(p_reference, '')), '');
  note_ text := nullif(btrim(coalesce(p_notes, '')), '');
  cash_ text := nullif(btrim(coalesce(p_cash_amount, '')), '');
  digits int;
  it jsonb; pid uuid; q int; prod record; promo record;
  lines jsonb := '[]'::jsonb; total_ numeric := 0; n int;
  oid uuid; onum int;
  t date := public.today_lima();
  promos_ok boolean;
begin
  perform 1 from public.restaurants where id = p_restaurant;
  if not found then raise exception 'Restaurante no encontrado.'; end if;
  st := coalesce(public.effective_status(p_restaurant), 'pendiente');
  if st not in ('activo', 'pendiente') then
    raise exception 'Este restaurante no está recibiendo pedidos en este momento.';
  end if;

  -- (a) Fuera de horario: no se reciben pedidos. Sin horario configurado (NULL) no se bloquea.
  if public.restaurant_is_open(p_restaurant) is false then
    raise exception 'El local está cerrado en este momento. Podrás hacer tu pedido cuando abra.';
  end if;

  if p_delivery_type not in ('delivery', 'pickup') then raise exception 'Modalidad de entrega inválida.'; end if;
  if p_payment_method not in ('yape_plin', 'efectivo', 'tarjeta') then raise exception 'Método de pago inválido.'; end if;
  if char_length(name_) < 2 or char_length(name_) > 80 then raise exception 'Escribe tu nombre y apellido.'; end if;
  if phone_ is not null and char_length(phone_) > 20 then raise exception 'El celular es demasiado largo.'; end if;
  digits := char_length(regexp_replace(coalesce(phone_, ''), '\D', '', 'g'));

  if p_delivery_type = 'delivery' then
    if digits < 7 then raise exception 'Ingresa un celular válido para el delivery.'; end if;
    if coalesce(char_length(addr), 0) < 4 and (p_latitude is null or p_longitude is null) then
      raise exception 'Ingresa tu dirección o comparte tu ubicación.';
    end if;
    if p_latitude is not null and (p_latitude not between -90 and 90) then raise exception 'Ubicación inválida.'; end if;
    if p_longitude is not null and (p_longitude not between -180 and 180) then raise exception 'Ubicación inválida.'; end if;
  else
    addr := null; ref_ := null; p_latitude := null; p_longitude := null;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40 then
    raise exception 'Tu pedido está vacío.';
  end if;

  promos_ok := coalesce((public.plan_limits(p_restaurant)->>'promotions')::boolean, false);

  for it in select value from jsonb_array_elements(p_items) loop
    begin
      pid := (it->>'id')::uuid;
      q := (it->>'qty')::int;
    exception when others then
      raise exception 'Pedido inválido. Vuelve a armarlo.';
    end;
    if q < 1 or q > 99 then raise exception 'Cantidad inválida.'; end if;

    if coalesce(it->>'kind', 'product') = 'promo' then
      -- (b) Promoción: nombre, precio e imagen salen de la base de datos
      select pr.title, pr.price, pr.image_url into promo
      from public.promotions pr
      where pr.id = pid and pr.restaurant_id = p_restaurant and pr.is_active
        and pr.price is not null and promos_ok
        and (pr.starts_at is null or pr.starts_at <= t)
        and (pr.ends_at is null or pr.ends_at >= t);
      if not found then raise exception 'Una promoción de tu pedido ya no está disponible. Actualiza la página.'; end if;
      lines := lines || jsonb_build_object('id', pid, 'name', promo.title, 'price', promo.price, 'qty', q, 'image_url', promo.image_url, 'kind', 'promo');
      total_ := total_ + promo.price * q;
    else
      select p.name, p.price, p.image_url, p.is_available into prod
      from public.products p
      join public.categories c on c.id = p.category_id and c.restaurant_id = p.restaurant_id
      where p.id = pid and p.restaurant_id = p_restaurant and p.is_published and c.is_visible;
      if not found then raise exception 'Un producto de tu pedido ya no está disponible. Actualiza la página.'; end if;
      if not prod.is_available then raise exception '“%” está agotado.', prod.name; end if;
      lines := lines || jsonb_build_object('id', pid, 'name', prod.name, 'price', prod.price, 'qty', q, 'image_url', prod.image_url);
      total_ := total_ + prod.price * q;
    end if;
  end loop;

  -- Freno contra abuso
  select count(*) into n from public.orders where restaurant_id = p_restaurant and created_at > now() - interval '1 minute';
  if n >= 30 then raise exception 'Hay muchos pedidos en este momento. Inténtalo en un minuto.'; end if;
  if phone_ is not null then
    select count(*) into n from public.orders
     where restaurant_id = p_restaurant and customer_phone = phone_ and created_at > now() - interval '10 minutes';
    if n >= 5 then raise exception 'Ya enviaste varios pedidos. Espera unos minutos.'; end if;
  end if;

  -- Correlativo independiente por restaurante (empieza en 1 si no tiene pedidos)
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant::text, 0));
  select coalesce(max(order_number), 0) + 1
    into onum
    from public.orders
   where restaurant_id = p_restaurant;

  insert into public.orders (
    restaurant_id, order_number, customer_name, customer_phone, delivery_type, address, reference,
    latitude, longitude, payment_method, cash_amount, notes, items, total
  )
  values (
    p_restaurant, onum, name_, phone_, p_delivery_type, left(addr, 160), left(ref_, 120),
    p_latitude, p_longitude, p_payment_method,
    case when p_payment_method = 'efectivo' then left(cash_, 12) else null end,
    left(note_, 300), lines, total_
  )
  returning id, order_number into oid, onum;

  return jsonb_build_object('id', oid, 'order_number', onum, 'total', total_, 'items', lines);
end $function$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------
-- ROLLBACK (solo si algo sale mal):
--  1) Ejecuta de nuevo la definición ORIGINAL de create_order (la que guardaste antes de esta migración).
--  2) alter table public.promotions drop column price;
--  (is_open_now y restaurant_is_open pueden quedarse: no afectan nada por sí solas.)
-- ---------------------------------------------------------------------------------------------