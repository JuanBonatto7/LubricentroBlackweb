-- ==========================================================
-- Marcas, medio de pago y email opcional en pedidos
-- Se puede ejecutar más de una vez. No borra datos.
-- ==========================================================
begin;

-- ---------- Marcas ----------
create table if not exists public.brands (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists brands_name_unique on public.brands (lower(name));
alter table public.brands enable row level security;

drop policy if exists brands_read on public.brands;
create policy brands_read on public.brands
  for select to anon, authenticated using (true);
drop policy if exists brands_admin_insert on public.brands;
create policy brands_admin_insert on public.brands
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists brands_admin_update on public.brands;
create policy brands_admin_update on public.brands
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists brands_admin_delete on public.brands;
create policy brands_admin_delete on public.brands
  for delete to authenticated using ((select public.is_admin()));

-- Cada producto puede tener una marca. Si se borra la marca, el producto queda "sin marca".
alter table public.products add column if not exists brand_id text
  references public.brands(id) on delete set null;
create index if not exists products_brand_idx on public.products(brand_id);

-- ---------- Pedidos: medio de pago y email opcional ----------
alter table public.orders add column if not exists payment_method text not null default ''
  check (char_length(payment_method) <= 60);
alter table public.orders alter column customer_email drop not null;

create or replace function public.create_order(p_payload jsonb, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  existing public.orders;
  item jsonb;
  product_row public.products;
  v_order_id bigint;
  v_order_number text;
  v_total numeric(12,2) := 0;
  items_snapshot jsonb := '[]'::jsonb;
  qty integer;
  unit numeric(12,2);
  line_total numeric(12,2);
  delivery jsonb := coalesce(p_payload->'delivery', '{}'::jsonb);
  customer jsonb := coalesce(p_payload->'customer', '{}'::jsonb);
  v_email text := nullif(lower(trim(coalesce(customer->>'email', ''))), '');
  v_payment text := left(trim(coalesce(p_payload->>'paymentMethod', '')), 60);
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) < 16 then raise exception using message = 'Clave de idempotencia inválida', errcode = '22023'; end if;
  select * into existing from public.orders where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('number', existing.number, 'status', existing.status, 'total', existing.total, 'createdAt', existing.created_at, 'duplicate', true); end if;
  if length(trim(coalesce(customer->>'name',''))) < 2 or length(trim(coalesce(customer->>'phone',''))) < 8 then raise exception using message = 'Datos del cliente inválidos', errcode = '22023'; end if;
  if v_email is not null and position('@' in v_email) < 2 then raise exception using message = 'Email inválido', errcode = '22023'; end if;
  if coalesce(delivery->>'method','') not in ('retiro','envio') then raise exception using message = 'Método de entrega inválido', errcode = '22023'; end if;
  if delivery->>'method' = 'envio' and length(trim(coalesce(delivery->>'address',''))) < 5 then raise exception using message = 'La dirección es obligatoria', errcode = '22023'; end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') = 0 then raise exception using message = 'El pedido no tiene productos', errcode = '22023'; end if;

  v_order_number := 'BK-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  insert into public.orders(number, idempotency_key, customer_name, customer_phone, customer_email, delivery_method, delivery_address, notes, total, payment_method)
  values (v_order_number, p_idempotency_key, trim(customer->>'name'), trim(customer->>'phone'), v_email, delivery->>'method', coalesce(delivery->>'address',''), left(coalesce(delivery->>'notes',''), 500), 0, v_payment)
  returning id into v_order_id;

  for item in select * from jsonb_array_elements(p_payload->'items') loop
    qty := (item->>'quantity')::integer;
    if qty is null or qty < 1 or qty > 100 then raise exception using message = 'Cantidad inválida', errcode = '22023'; end if;
    select * into product_row from public.products where id = item->>'productId' and active = true for update;
    if not found or product_row.sold_out or product_row.stock < qty then raise exception using message = 'Producto sin stock o no disponible', errcode = 'P0001'; end if;
    unit := product_row.price; line_total := unit * qty; v_total := v_total + line_total;
    insert into public.order_items(order_id, product_id, name, unit_price, quantity, subtotal) values (v_order_id, product_row.id, product_row.name, unit, qty, line_total);
    update public.products set stock = stock - qty, sold_out = (stock - qty = 0) where id = product_row.id;
    items_snapshot := items_snapshot || jsonb_build_array(jsonb_build_object('productId', product_row.id, 'name', product_row.name, 'unitPrice', unit, 'quantity', qty, 'subtotal', line_total));
  end loop;

  update public.orders set total = v_total where id = v_order_id;
  return jsonb_build_object('number', v_order_number, 'status', 'pendiente_pago', 'payment', jsonb_build_object('status','pendiente'), 'total', v_total, 'items', items_snapshot, 'createdAt', now());
end;
$$;

commit;
