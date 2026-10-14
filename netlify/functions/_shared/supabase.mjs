import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

export function serverClient() {
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase server configuration');
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function authClient() {
  if (!url || !anonKey) throw new Error('Missing Supabase public configuration');
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function response(statusCode, body, event) {
  const origin = process.env.ALLOWED_ORIGIN || event?.headers?.origin || '*';
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      Vary: 'Origin',
    },
    body: JSON.stringify(body),
  };
}

export function options(event) { return response(204, null, event); }

export function parseBody(event) {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { throw Object.assign(new Error('JSON inválido'), { statusCode: 400 }); }
}

export function bearer(event) {
  const value = event.headers?.authorization || event.headers?.Authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export async function requireAdmin(event) {
  const token = bearer(event);
  if (!token) throw Object.assign(new Error('Autenticación requerida'), { statusCode: 401 });
  const supabase = serverClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw Object.assign(new Error('Sesión inválida'), { statusCode: 401 });
  const { data: admin, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!admin) throw Object.assign(new Error('No autorizado'), { statusCode: 403 });
  return { supabase, user };
}

export function fail(error, event) {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error(error);
  return response(statusCode, { error: statusCode >= 500 ? 'Error interno del servidor' : error.message }, event);
}
