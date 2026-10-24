-- ==========================================================
-- Categorías y marcas reales del local (24/10/2026)
-- - Logo en las marcas (columna logo_url)
-- - Categorías: Shampoo, Ceras y selladores, Acondicionadores,
--   Desengrasantes, Microfibras y Accesorios (+ Lubricantes, Filtros
--   y Refrigerantes y aditivos, que quedan al final)
-- - Mueve los productos de ejemplo y borra las categorías reemplazadas
--   (solo si quedaron vacías). No borra productos.
-- - Carga las 9 marcas con su logo (no duplica si ya existen)
-- Se puede ejecutar más de una vez.
-- ==========================================================
begin;

alter table public.brands add column if not exists logo_url text;

insert into public.categories (id, name, icon, sort_order) values
  ('shampoo', 'Shampoo', 'bubbles', 1),
  ('ceras-selladores', 'Ceras y selladores', 'shield', 2),
  ('acondicionadores', 'Acondicionadores', 'bottle', 3),
  ('desengrasantes', 'Desengrasantes', 'spray', 4),
  ('microfibras', 'Microfibras', 'cloth', 5),
  ('accesorios', 'Accesorios', 'bag', 6)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;
update public.categories set sort_order = 7 where id = 'lubricantes';
update public.categories set sort_order = 8 where id = 'filtros';
update public.categories set sort_order = 9 where id = 'refrigerantes-aditivos';

update public.products set category_id = 'shampoo' where id in ('shampoo-neutro');
update public.products set category_id = 'ceras-selladores' where id in ('cera-liquida', 'cera-pasta');
update public.products set category_id = 'acondicionadores' where id in ('limpiador-interiores', 'renovador-tablero', 'abrillantador-neumaticos');
update public.products set category_id = 'desengrasantes' where id in ('limpia-llantas', 'desengrasante-motor');
update public.products set category_id = 'microfibras' where id in ('microfibra-x3');
update public.products set category_id = 'accesorios' where id in ('limpia-vidrios', 'kit-lavado', 'arcilla-descontaminante', 'aromatizante', 'escobillas-limpiaparabrisas');

delete from public.categories c
where c.id in ('limpieza-exterior', 'limpieza-interior', 'ceras-abrillantadores')
  and not exists (select 1 from public.products p where p.category_id = c.id);

with v(id, name, logo) as (values
  ('supercar', 'Supercar', 'assets/brands/supercar.png'),
  ('tec', 'TEC', 'assets/brands/tec.png'),
  ('3d', '3D', 'assets/brands/3d.png'),
  ('vonixx', 'Vonixx', 'assets/brands/vonixx.png'),
  ('toxic-shine', 'Toxic Shine', 'assets/brands/toxic-shine.png'),
  ('full-car', 'Full Car', 'assets/brands/full-car.png'),
  ('speedway', 'Speedway', 'assets/brands/speedway.png'),
  ('laffitte', 'Laffitte', 'assets/brands/laffitte.png'),
  ('koch-chemie', 'Koch Chemie', 'assets/brands/koch-chemie.png'))
insert into public.brands (id, name, logo_url)
select v.id, v.name, v.logo from v
where not exists (select 1 from public.brands b where b.id = v.id or lower(b.name) = lower(v.name));

with v(id, name, logo) as (values
  ('supercar', 'Supercar', 'assets/brands/supercar.png'),
  ('tec', 'TEC', 'assets/brands/tec.png'),
  ('3d', '3D', 'assets/brands/3d.png'),
  ('vonixx', 'Vonixx', 'assets/brands/vonixx.png'),
  ('toxic-shine', 'Toxic Shine', 'assets/brands/toxic-shine.png'),
  ('full-car', 'Full Car', 'assets/brands/full-car.png'),
  ('speedway', 'Speedway', 'assets/brands/speedway.png'),
  ('laffitte', 'Laffitte', 'assets/brands/laffitte.png'),
  ('koch-chemie', 'Koch Chemie', 'assets/brands/koch-chemie.png'))
update public.brands b set logo_url = v.logo
from v where (b.id = v.id or lower(b.name) = lower(v.name)) and b.logo_url is null;

commit;
