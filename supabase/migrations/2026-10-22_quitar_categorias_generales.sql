-- Quitar categorías generales (Detailing, Productos para mantenimiento, Otros)
-- Mueve los productos de ejemplo a categorías específicas. No borra productos.
begin;
insert into public.categories (id, name, icon, sort_order) values ('refrigerantes-aditivos','Refrigerantes y aditivos','wrench',7)
on conflict (id) do nothing;
update public.categories set sort_order = 1 where id = 'limpieza-exterior';
update public.categories set sort_order = 2 where id = 'limpieza-interior';
update public.categories set sort_order = 3 where id = 'ceras-abrillantadores';
update public.categories set sort_order = 4 where id = 'accesorios';
update public.categories set sort_order = 5 where id = 'lubricantes';
update public.categories set sort_order = 6 where id = 'filtros';
update public.categories set sort_order = 7 where id = 'refrigerantes-aditivos';
update public.products set category_id = 'ceras-abrillantadores' where id = 'abrillantador-neumaticos';
update public.products set category_id = 'limpieza-exterior' where id = 'kit-lavado';
update public.products set category_id = 'limpieza-exterior' where id = 'arcilla-descontaminante';
update public.products set category_id = 'limpieza-exterior' where id = 'desengrasante-motor';
update public.products set category_id = 'refrigerantes-aditivos' where id = 'refrigerante';
update public.products set category_id = 'refrigerantes-aditivos' where id = 'aditivo-combustible';
update public.products set category_id = 'accesorios' where id = 'escobillas-limpiaparabrisas';
-- Solo se borran si ya no tienen productos (si alguno quedó, la categoría se conserva)
delete from public.categories c where c.id in ('detailing','mantenimiento','otros')
  and not exists (select 1 from public.products p where p.category_id = c.id);
commit;
