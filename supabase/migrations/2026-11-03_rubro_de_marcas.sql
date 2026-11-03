-- ==========================================================
-- Rubro de las marcas (03/11/2026)
-- Cada marca pertenece a un rubro (detailing, lubricantes, filtros).
-- Los rubros se definen en js/config.js (brandGroups); acá solo se guarda el id.
-- Las marcas que ya existían son todas de detailing.
-- Se puede ejecutar más de una vez. No borra datos.
-- ==========================================================
begin;

alter table public.brands add column if not exists rubro text not null default 'detailing';
alter table public.brands drop constraint if exists brands_rubro_check;
alter table public.brands add constraint brands_rubro_check check (rubro ~ '^[a-z0-9-]{1,40}$');

commit;
