import { requireAdmin, response, options, parseBody, fail } from './_shared/supabase.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options(event);
  try {
    const { supabase } = await requireAdmin(event);
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('orders').select('id,number,created_at,customer_name,customer_phone,customer_email,delivery_method,delivery_address,notes,total,status,payment_status,stock_restored_at,order_items(product_id,name,unit_price,quantity,subtotal)').order('created_at', { ascending: false });
      if (error) throw error;
      return response(200, { orders: data.map((o) => ({ number: o.number, createdAt: o.created_at, customer: { name: o.customer_name, phone: o.customer_phone, email: o.customer_email }, delivery: { method: o.delivery_method, address: o.delivery_address, label: o.delivery_method === 'envio' ? 'Envío a domicilio' : 'Retiro en el local', notes: o.notes }, total: o.total, status: o.status, payment: { status: o.payment_status }, items: o.order_items })) }, event);
    }
    if (event.httpMethod === 'PATCH') {
      const number = event.queryStringParameters?.number;
      const body = parseBody(event);
      if (!number) return response(400, { error: 'Falta el número de pedido' }, event);
      let result;
      if (body.status) {
        const allowed = ['pendiente_pago','pago_aprobado','pago_rechazado','en_preparacion','enviado','entregado','cancelado'];
        if (!allowed.includes(body.status)) return response(400, { error: 'Estado inválido' }, event);
        const { data, error } = await supabase.rpc('update_order_status', { p_number: number, p_status: body.status });
        if (error) throw error;
        result = data;
      }
      if (body.paymentStatus) {
        if (!['pendiente','aprobado','rechazado'].includes(body.paymentStatus)) return response(400, { error: 'Estado de pago inválido' }, event);
        const { error } = await supabase.from('orders').update({ payment_status: body.paymentStatus }).eq('number', number);
        if (error) throw error;
      }
      return response(200, result || { number }, event);
    }
    return response(405, { error: 'Método no permitido' }, event);
  } catch (error) { return fail(error, event); }
}
