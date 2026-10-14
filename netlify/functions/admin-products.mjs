import { serverClient, requireAdmin, response, options, parseBody, fail } from './_shared/supabase.mjs';

const shape = (p) => ({ id: p.id, name: p.name, description: p.description, price: p.price, stock: p.stock, category: p.category_id, featured: p.featured, active: p.active, soldOut: p.sold_out, image: p.image_url || '', art: p.art || {} });
const validate = (p, partial = false) => {
  if (!partial || p.name !== undefined) if (typeof p.name !== 'string' || p.name.trim().length < 2) throw Object.assign(new Error('Nombre inválido'), { statusCode: 400 });
  if (!partial || p.price !== undefined) if (!Number.isInteger(Number(p.price)) || Number(p.price) < 0) throw Object.assign(new Error('Precio inválido'), { statusCode: 400 });
  if (!partial || p.stock !== undefined) if (!Number.isInteger(Number(p.stock)) || Number(p.stock) < 0) throw Object.assign(new Error('Stock inválido'), { statusCode: 400 });
  if (!partial || p.category !== undefined) if (typeof p.category !== 'string' || !p.category) throw Object.assign(new Error('Categoría inválida'), { statusCode: 400 });
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options(event);
  try {
    const { supabase } = await requireAdmin(event);
    const id = event.queryStringParameters?.id;
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('products').select('id,name,description,price,stock,sold_out,category_id,featured,active,image_url,art').order('name');
      if (error) throw error;
      return response(200, { products: data.map(shape) }, event);
    }
    if (event.httpMethod === 'POST') {
      const p = parseBody(event); validate(p);
      const row = { id: String(p.id || p.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: p.name.trim(), description: String(p.description || '').trim(), price: Number(p.price), stock: Number(p.stock), category_id: p.category, featured: !!p.featured, active: p.active !== false, sold_out: !!p.soldOut, image_url: p.image || null, art: p.art || {} };
      const { data, error } = await supabase.from('products').insert(row).select().single();
      if (error) return response(error.code === '23505' ? 409 : 400, { error: error.message }, event);
      return response(201, shape(data), event);
    }
    if (event.httpMethod === 'PATCH') {
      if (!id) return response(400, { error: 'Falta el id del producto' }, event);
      const p = parseBody(event); validate(p, true);
      const updates = {};
      ['name','description','price','stock','featured','active','image'].forEach((key) => { if (p[key] !== undefined) updates[key === 'image' ? 'image_url' : key] = key === 'price' || key === 'stock' ? Number(p[key]) : p[key]; });
      if (p.category !== undefined) updates.category_id = p.category;
      if (p.soldOut !== undefined) updates.sold_out = !!p.soldOut;
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return response(200, shape(data), event);
    }
    if (event.httpMethod === 'DELETE') {
      if (!id) return response(400, { error: 'Falta el id del producto' }, event);
      const { error } = await supabase.from('products').update({ active: false }).eq('id', id);
      if (error) throw error;
      return response(204, null, event);
    }
    return response(405, { error: 'Método no permitido' }, event);
  } catch (error) { return fail(error, event); }
}
