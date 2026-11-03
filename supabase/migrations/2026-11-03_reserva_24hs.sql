-- ==========================================================
-- Reserva de stock por 24 horas (03/11/2026)
-- Un pedido descuenta stock al crearse y queda "reservado" (pendiente_pago).
-- Si en 24 horas nadie le cambia el estado, se cancela solo y el stock vuelve.
-- Revisa cada 15 minutos con pg_cron.
-- Los pedidos pendientes que ya existían también tienen 24 horas desde ahora.
-- Se puede ejecutar más de una vez. No borra datos.
-- ==========================================================
create extension if not exists pg_cron with schema pg_catalog;

alter table public.orders add column if not exists reserved_until timestamptz not null default (now() + interval '24 hours');
alter table public.orders add column if not exists expired_at timestamptz;
create index if not exists orders_reserved_idx on public.orders(reserved_until) where status = 'pendiente_pago';

create or replace function public.expire_reservations() returns integer
language plpgsql security definer set search_path = public as $$
declare o public.orders; item record; v_count integer := 0;
begin
  for o in select * from public.orders
    where status = 'pendiente_pago' and reserved_until < now() and stock_restored_at is null
    for update skip locked
  loop
    for item in select product_id, quantity from public.order_items where order_id = o.id loop
      update public.products set stock = stock + item.quantity, sold_out = false where id = item.product_id;
    end loop;
    update public.orders set status = 'cancelado', stock_restored_at = now(), expired_at = now() where id = o.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
-- Solo la ejecuta la tarea programada: ni visitantes ni usuarios con login.
revoke execute on function public.expire_reservations() from public, anon, authenticated;

select cron.schedule('liberar-reservas', '*/15 * * * *', 'select public.expire_reservations()');
