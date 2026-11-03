-- ==========================================================
-- Marcas de lubricantes y filtros (03/11/2026)
-- Requiere la migración 2026-11-03_rubro_de_marcas.sql.
-- No duplica si ya existen. Se puede ejecutar más de una vez.
-- ==========================================================
with v(id, name, logo, rubro) as (values
  ('fram', 'Fram', 'assets/brands/fram.png', 'filtros'),
  ('wega', 'Wega', 'assets/brands/wega.png', 'filtros'),
  ('castrol', 'Castrol', 'assets/brands/castrol.png', 'lubricantes'),
  ('valvoline', 'Valvoline', 'assets/brands/valvoline.png', 'lubricantes'),
  ('mobil', 'Mobil', 'assets/brands/mobil.png', 'lubricantes'),
  ('total', 'Total', 'assets/brands/total.png', 'lubricantes'),
  ('motul', 'Motul', 'assets/brands/motul.png', 'lubricantes'),
  ('elaion', 'Elaion', 'assets/brands/elaion.png', 'lubricantes'),
  ('gulf', 'Gulf', 'assets/brands/gulf.png', 'lubricantes'),
  ('shell', 'Shell', 'assets/brands/shell.png', 'lubricantes'),
  ('petronas', 'Petronas', 'assets/brands/petronas.png', 'lubricantes'))
insert into public.brands (id, name, logo_url, rubro)
select v.id, v.name, v.logo, v.rubro from v
where not exists (select 1 from public.brands b where b.id = v.id or lower(b.name) = lower(v.name));
