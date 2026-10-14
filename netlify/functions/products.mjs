import { serverClient, response, options, fail } from './_shared/supabase.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options(event);
  if (event.httpMethod !== 'GET') return response(405, { error: 'Método no permitido' }, event);
  try {
    const supabase = serverClient();
    const [{ data: categories, error: categoryError }, { data: products, error: productError }] = await Promise.all([
      supabase.from('categories').select('id,name,icon').order('sort_order'),
      supabase.from('products').select('id,name,description,price,stock,sold_out,category_id,featured,image_url,art').eq('active', true).order('featured', { ascending: false }).order('name'),
    ]);
    if (categoryError || productError) throw categoryError || productError;
    return response(200, { categories, products: products.map((p) => ({ ...p, category: p.category_id, soldOut: p.sold_out, image: p.image_url })) }, event);
  } catch (error) { return fail(error, event); }
}
