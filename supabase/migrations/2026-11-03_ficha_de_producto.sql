-- ==========================================================
-- Ficha de producto (03/11/2026)
-- - Descripción larga: hasta 2000 caracteres (antes 500)
-- - Datos del producto: lista de { label, value }
--   ej. [{"label":"Viscosidad","value":"5W-30"},{"label":"Contenido","value":"4 litros"}]
-- Se puede ejecutar más de una vez. No borra datos.
-- ==========================================================
begin;

alter table public.products drop constraint if exists products_description_check;
alter table public.products add constraint products_description_check check (char_length(description) <= 2000);

alter table public.products add column if not exists specs jsonb not null default '[]'::jsonb;
alter table public.products drop constraint if exists products_specs_check;
alter table public.products add constraint products_specs_check
  check (jsonb_typeof(specs) = 'array' and jsonb_array_length(specs) <= 30);

commit;
