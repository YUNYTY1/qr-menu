-- UNDERTY MENU · 011 · Más distribuciones de productos en la carta
--
-- Qué hace:
--  1) Reemplaza la restricción de restaurant_themes.layout para aceptar los modelos nuevos:
--       horizontal  Tarjetas horizontales (el diseño que hoy muestran todos los menús)
--       cuadricula  Cuadrícula de 2 columnas (ahora sí, también en celular)
--       compacta    Cuadrícula de 3 columnas
--       lista       Lista con miniatura        (ya existía)
--       grande      Tarjetas grandes           (ya existía)
--       carrusel    Carrusel horizontal
--       texto       Lista solo texto
--  2) Los restaurantes que tenían 'cuadricula' pasan a 'horizontal', que es EXACTAMENTE el
--     diseño que ya veían (así ningún menú publicado cambia de aspecto).
--  3) El valor por defecto de los restaurantes nuevos pasa a 'horizontal'.
--
-- La restricción se busca por su contenido (no por su nombre) para no depender de cómo se llame.

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.restaurant_themes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%layout%'
  loop
    execute format('alter table public.restaurant_themes drop constraint %I', c);
  end loop;
end $$;

alter table public.restaurant_themes
  add constraint restaurant_themes_layout_check
  check (layout in ('horizontal','cuadricula','compacta','lista','grande','carrusel','texto'));

update public.restaurant_themes set layout = 'horizontal' where layout = 'cuadricula';

alter table public.restaurant_themes alter column layout set default 'horizontal';

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------------------------
-- ROLLBACK (solo si algo sale mal):
-- ---------------------------------------------------------------------------------------------
-- update public.restaurant_themes set layout = 'cuadricula' where layout not in ('lista','grande');
-- alter table public.restaurant_themes drop constraint restaurant_themes_layout_check;
-- alter table public.restaurant_themes add constraint restaurant_themes_layout_check
--   check (layout in ('cuadricula','lista','grande'));
-- alter table public.restaurant_themes alter column layout set default 'cuadricula';
-- notify pgrst, 'reload schema';