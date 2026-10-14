import { authClient, serverClient, response, options, parseBody, fail } from './_shared/supabase.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options(event);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Método no permitido' }, event);
  try {
    const { email, password } = parseBody(event);
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || password.length < 8) return response(400, { error: 'Credenciales inválidas' }, event);
    const { data, error } = await authClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user || !data.session) return response(401, { error: 'Usuario o contraseña incorrectos' }, event);
    const { data: admin, error: adminError } = await serverClient().from('admin_users').select('user_id,email').eq('user_id', data.user.id).maybeSingle();
    if (adminError) throw adminError;
    if (!admin) return response(403, { error: 'La cuenta no está autorizada como administradora' }, event);
    return response(200, { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, user: { id: data.user.id, email: admin.email } }, event);
  } catch (error) { return fail(error, event); }
}
