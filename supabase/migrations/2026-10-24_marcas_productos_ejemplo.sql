-- Marcas para los productos de ejemplo (para ver la web con marcas hasta cargar los reales)
begin;
update public.products set brand_id = 'vonixx' where id = 'shampoo-neutro';
update public.products set brand_id = 'toxic-shine' where id = 'cera-liquida';
update public.products set brand_id = '3d' where id = 'cera-pasta';
update public.products set brand_id = 'koch-chemie' where id = 'limpiador-interiores';
update public.products set brand_id = 'supercar' where id = 'renovador-tablero';
update public.products set brand_id = 'laffitte' where id = 'desengrasante-motor';
update public.products set brand_id = 'tec' where id = 'limpia-llantas';
update public.products set brand_id = 'speedway' where id = 'limpia-vidrios';
update public.products set brand_id = 'full-car' where id = 'microfibra-x3';
update public.products set brand_id = 'toxic-shine' where id = 'kit-lavado';
update public.products set brand_id = '3d' where id = 'arcilla-descontaminante';
update public.products set brand_id = 'full-car' where id = 'aromatizante';
update public.products set brand_id = 'speedway' where id = 'escobillas-limpiaparabrisas';
update public.products set brand_id = 'vonixx' where id = 'abrillantador-neumaticos';
commit;
