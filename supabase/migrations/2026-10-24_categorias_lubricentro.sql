-- ==========================================================
-- Categorías de lubricentro: Aromatizantes, Lubricantes, Aditivos,
-- Filtros y Baterías (con íconos propios). Reordena todas las categorías,
-- mueve los productos de ejemplo y borra "Refrigerantes y aditivos" si
-- queda vacía. No borra productos. Se puede ejecutar más de una vez.
-- ==========================================================
begin;
insert into public.categories (id, name, icon, sort_order) values
  ('shampoo', 'Shampoo', 'bubbles', 1),
  ('ceras-selladores', 'Ceras y selladores', 'shield', 2),
  ('acondicionadores', 'Acondicionadores', 'bottle', 3),
  ('desengrasantes', 'Desengrasantes', 'spray', 4),
  ('microfibras', 'Microfibras', 'cloth', 5),
  ('aromatizantes', 'Aromatizantes', 'tree', 6),
  ('accesorios', 'Accesorios', 'bag', 7),
  ('lubricantes', 'Lubricantes', 'oilcan', 8),
  ('aditivos', 'Aditivos', 'additive', 9),
  ('filtros', 'Filtros', 'oilfilter', 10),
  ('baterias', 'Baterías', 'battery', 11)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;
update public.products set category_id = 'aditivos' where id in ('refrigerante', 'aditivo-combustible');
update public.products set category_id = 'aromatizantes' where id in ('aromatizante');
delete from public.categories c where c.id = 'refrigerantes-aditivos'
  and not exists (select 1 from public.products p where p.category_id = c.id);
commit;
