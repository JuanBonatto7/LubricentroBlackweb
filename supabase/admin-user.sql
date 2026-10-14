-- Ejecutar después de crear el usuario en Supabase Auth > Users.
-- Reemplazá los valores entre comillas por el UUID y email reales.
insert into public.admin_users (user_id, email)
values ('00000000-0000-0000-0000-000000000000', 'admin@example.com')
on conflict (user_id) do update set email = excluded.email;
