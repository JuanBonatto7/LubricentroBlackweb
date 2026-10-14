import { serverClient, response, options, parseBody, fail } from './_shared/supabase.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options(event);
  if (event.httpMethod !== 'POST') return response(405, { error: 'Método no permitido' }, event);
  try {
    const payload = parseBody(event);
    const key = event.headers?.['idempotency-key'] || event.headers?.['Idempotency-Key'] || payload.clientRequestId;
    const { clientRequestId, ...safePayload } = payload;
    if (typeof key !== 'string' || key.length < 16 || key.length > 120) return response(400, { error: 'Falta una clave de solicitud válida' }, event);
    const { data, error } = await serverClient().rpc('create_order', { p_payload: safePayload, p_idempotency_key: key });
    if (error) {
      const statusCode = error.code === 'P0001' ? 409 : error.code === '22023' ? 400 : 500;
      return response(statusCode, { error: error.message }, event);
    }
    return response(201, data, event);
  } catch (error) { return fail(error, event); }
}
