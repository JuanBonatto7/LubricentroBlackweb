insert into public.categories (id, name, icon, sort_order) values
('shampoo','Shampoo','bubbles',1),('ceras-selladores','Ceras y selladores','shield',2),('acondicionadores','Acondicionadores','bottle',3),('desengrasantes','Desengrasantes','spray',4),('microfibras','Microfibras','cloth',5),('aromatizantes','Aromatizantes','tree',6),('accesorios','Accesorios','bag',7),('lubricantes','Lubricantes','oilcan',8),('aditivos','Aditivos','additive',9),('filtros','Filtros','oilfilter',10),('baterias','Baterías','battery',11)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.brands (id, name, logo_url) values
('supercar','Supercar','assets/brands/supercar.png'),
('tec','TEC','assets/brands/tec.png'),
('3d','3D','assets/brands/3d.png'),
('vonixx','Vonixx','assets/brands/vonixx.png'),
('toxic-shine','Toxic Shine','assets/brands/toxic-shine.png'),
('full-car','Full Car','assets/brands/full-car.png'),
('speedway','Speedway','assets/brands/speedway.png'),
('laffitte','Laffitte','assets/brands/laffitte.png'),
('koch-chemie','Koch Chemie','assets/brands/koch-chemie.png')
on conflict (id) do update set name = excluded.name, logo_url = excluded.logo_url;

insert into public.products (id,name,description,price,stock,category_id,featured,image_url,art) values
('shampoo-neutro','Shampoo neutro','Limpieza profunda y segura para la pintura.',5800,24,'shampoo',true,null,'{"shape":"bottle","color":"#2f9e5b"}'),
('limpia-llantas','Limpia llantas','Elimina el polvo de frenos y realza el brillo.',6500,12,'desengrasantes',false,null,'{"shape":"spray","color":"#cfd6dc"}'),
('limpia-vidrios','Limpia vidrios','Cristales sin vetas ni marcas.',4300,18,'accesorios',false,null,'{"shape":"spray","color":"#1fa6b8"}'),
('limpiador-interiores','Limpiador de interiores','Renueva y protege tapizados y plásticos.',7200,15,'acondicionadores',true,null,'{"shape":"bottle","color":"#6fbf2a"}'),
('renovador-tablero','Renovador de tablero','Acabado mate y protección contra el sol.',6900,3,'acondicionadores',false,null,'{"shape":"spray","color":"#e8a317"}'),
('cera-liquida','Cera líquida','Brillo y protección por más tiempo.',8900,10,'ceras-selladores',true,null,'{"shape":"bottle","color":"#e11d2e"}'),
('cera-pasta','Cera en pasta','Protección intensa para la pintura.',12500,0,'ceras-selladores',false,null,'{"shape":"tin","color":"#e8a317"}'),
('abrillantador-neumaticos','Abrillantador de neumáticos','Negro profundo y protección.',6800,14,'acondicionadores',true,null,'{"shape":"bottle","color":"#e8a317"}'),
('kit-lavado','Kit de lavado completo','Shampoo, esponja y paño de microfibra.',28900,6,'accesorios',true,null,'{"shape":"box","color":"#e11d2e"}'),
('arcilla-descontaminante','Arcilla descontaminante','Quita impurezas adheridas a la pintura.',15800,4,'accesorios',false,null,'{"shape":"tin","color":"#1fa6b8"}'),
('microfibra-x3','Paños de microfibra x3','Suaves, absorbentes y sin pelusa.',4200,40,'microfibras',true,null,'{"shape":"cloth","color":"#e11d2e"}'),
('aromatizante','Aromatizante','Fragancia duradera para tu auto.',3900,30,'aromatizantes',false,null,'{"shape":"spray","color":"#1fa6b8"}'),
('aceite-5w30','Aceite 5W-30 sintético 4 L','Protección y rendimiento para el motor.',38500,8,'lubricantes',true,null,'{"shape":"jug","color":"#e11d2e"}'),
('aceite-10w40','Aceite 10W-40 semisintético 4 L','Uso diario, motores nafteros y diésel.',32000,6,'lubricantes',false,null,'{"shape":"jug","color":"#e8a317"}'),
('aceite-15w40','Aceite 15W-40 mineral 4 L','Lubricación económica para uso general.',29000,5,'lubricantes',false,null,'{"shape":"jug","color":"#2f6fd1"}'),
('filtro-aceite','Filtro de aceite','Retiene impurezas y cuida el motor.',5200,20,'filtros',true,null,'{"shape":"filter","color":"#e11d2e"}'),
('filtro-aire','Filtro de aire','Mejor respiración y menor consumo.',6800,11,'filtros',false,null,'{"shape":"filter","color":"#e8a317"}'),
('refrigerante','Refrigerante 1 L','Protege el motor del sobrecalentamiento.',9800,13,'aditivos',false,null,'{"shape":"jug","color":"#1fa6b8"}'),
('aditivo-combustible','Aditivo para combustible','Limpia inyectores y mejora el rendimiento.',4900,17,'aditivos',false,null,'{"shape":"bottle","color":"#2f6fd1"}'),
('desengrasante-motor','Desengrasante de motor','Remueve grasa y suciedad del vano motor.',7400,9,'desengrasantes',false,null,'{"shape":"spray","color":"#e8a317"}'),
('escobillas-limpiaparabrisas','Escobillas limpiaparabrisas (par)','Barrido silencioso y sin marcas.',9500,7,'accesorios',false,null,'{"shape":"box","color":"#2a323a"}')
on conflict (id) do update set name = excluded.name, description = excluded.description, price = excluded.price, stock = excluded.stock, category_id = excluded.category_id, featured = excluded.featured, art = excluded.art;

-- Marcas de los productos de ejemplo
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
