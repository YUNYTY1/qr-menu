-- UNDERTY MENU · 005 · Planes iniciales
-- Los precios son de EJEMPLO: edítalos desde el panel (Planes) o aquí.
-- Límites: max_products / max_branches (-1 = ilimitado) y funciones habilitadas.

insert into public.plans (code, name, price, setup_fee, limits) values
 ('starter', 'Starter', 29, 99,
  '{"max_products":30,"max_branches":1,"advanced_theme":false,"promotions":false,"stats":false,"branch_stats":false}'),
 ('profesional', 'Profesional', 59, 149,
  '{"max_products":-1,"max_branches":1,"advanced_theme":true,"promotions":true,"stats":true,"branch_stats":false}'),
 ('premium', 'Premium', 99, 199,
  '{"max_products":-1,"max_branches":3,"advanced_theme":true,"promotions":true,"stats":true,"branch_stats":true}')
on conflict (code) do nothing;
