(function () {
  const B = window.BLACK;
  const TOKEN_KEY = 'black_admin_access_token';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = B.esc;
  let products = [];
  let orders = [];
  let editing = null;

  const token = () => sessionStorage.getItem(TOKEN_KEY) || '';
  const api = async (path, options = {}) => {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const res = await fetch(path, Object.assign({}, options, { headers }));
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la operación.');
    return data;
  };
  const errorMessage = (message) => { const el = $('#admin-error'); if (el) el.textContent = message; };
  const showApp = (on) => { $('#login').hidden = on; $('#app').hidden = !on; };

  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); errorMessage('');
    const button = event.target.querySelector('[type="submit"]'); button.disabled = true;
    try {
      const data = await api('/api/admin/auth', { method: 'POST', body: JSON.stringify({ email: $('#adm-user').value, password: $('#adm-pass').value }) });
      sessionStorage.setItem(TOKEN_KEY, data.accessToken); showApp(true); await refreshProducts(); await refreshOrders();
    } catch (error) { errorMessage(error.message); showApp(false); } finally { button.disabled = false; }
  });
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem(TOKEN_KEY); showApp(false); });

  const tabs = { productos: $('#tab-productos'), pedidos: $('#tab-pedidos') };
  Object.entries(tabs).forEach(([name, tab]) => tab.addEventListener('click', () => { Object.entries(tabs).forEach(([key, item]) => { const active = key === name; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); $(`#panel-${key}`).hidden = !active; }); if (name === 'pedidos') renderOrders(); }));

  const categoryName = (id) => (B.Catalog.categories().find((c) => c.id === id) || {}).name || id;
  const renderProducts = () => {
    const query = B.norm($('#prod-search').value);
    const rows = products.filter((p) => !query || B.norm(`${p.name} ${categoryName(p.category)}`).includes(query));
    $('#prod-count').textContent = `${rows.length} ${rows.length === 1 ? 'producto' : 'productos'}`;
    $('#prod-list').innerHTML = rows.length ? rows.map((p) => `<article class="adm-item${p.active === false ? ' is-hidden' : ''}"><div class="adm-main-info"><p class="adm-name">${esc(p.name)}</p><p class="adm-sub">${esc(categoryName(p.category))}</p></div><p class="adm-num"><span class="adm-lbl">Precio</span>${B.fmt(p.price)}</p><p class="adm-num"><span class="adm-lbl">Stock</span>${p.stock}</p><div class="adm-badges">${p.active === false ? '<span class="adm-badge b-gray">Oculto</span>' : ''}${p.stock <= 0 ? '<span class="adm-badge b-red">Sin stock</span>' : ''}</div><div class="adm-row-actions"><button class="btn btn-line" type="button" data-edit="${esc(p.id)}">Editar</button><button class="btn btn-line" type="button" data-del="${esc(p.id)}">Ocultar</button></div></article>`).join('') : '<div class="empty"><p>No hay productos.</p></div>';
  };
  const refreshProducts = async () => { const data = await api('/api/admin/products'); products = data.products || []; renderProducts(); };
  $('#prod-search').addEventListener('input', renderProducts);
  $('#prod-list').addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit]'); const del = event.target.closest('[data-del]');
    if (edit) openProduct(products.find((p) => p.id === edit.dataset.edit));
    if (del && window.confirm('¿Ocultar este producto de la tienda?')) { try { await api(`/api/admin/products?id=${encodeURIComponent(del.dataset.del)}`, { method: 'DELETE' }); await refreshProducts(); } catch (error) { errorMessage(error.message); } }
  });

  const dialog = $('#prod-dialog'); const form = $('#prod-form'); const category = $('#p-cat');
  category.innerHTML = B.Catalog.categories().map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  function openProduct(product) { editing = product || null; $('#prod-dialog-title').textContent = product ? 'Editar producto' : 'Nuevo producto'; form.elements.name.value = product?.name || ''; form.elements.description.value = product?.description || ''; form.elements.price.value = product?.price ?? ''; form.elements.stock.value = product?.stock ?? ''; form.elements.category.value = product?.category || B.Catalog.categories()[0]?.id || ''; form.elements.featured.checked = !!product?.featured; form.elements.soldOut.checked = !!product?.soldOut; form.elements.active.checked = product ? product.active !== false : true; $('#p-form-error').textContent = ''; if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); form.elements.name.focus(); }
  $('#new-product').addEventListener('click', () => openProduct(null));
  $('#p-cancel').addEventListener('click', () => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); });
  form.addEventListener('submit', async (event) => { event.preventDefault(); const p = { name: form.elements.name.value.trim(), description: form.elements.description.value.trim(), price: Number(form.elements.price.value), stock: Number(form.elements.stock.value), category: form.elements.category.value, featured: form.elements.featured.checked, soldOut: form.elements.soldOut.checked, active: form.elements.active.checked, image: '' }; if (p.name.length < 2 || !Number.isInteger(p.price) || p.price < 0 || !Number.isInteger(p.stock) || p.stock < 0) { $('#p-form-error').textContent = 'Completá nombre, precio y stock con valores válidos.'; return; } const button = form.querySelector('[type="submit"]'); button.disabled = true; try { await api(editing ? `/api/admin/products?id=${encodeURIComponent(editing.id)}` : '/api/admin/products', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(p) }); if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); await refreshProducts(); } catch (error) { $('#p-form-error').textContent = error.message; } finally { button.disabled = false; } });

  const statusLabels = { pendiente_pago: 'Pendiente de pago', pago_aprobado: 'Pago aprobado', pago_rechazado: 'Pago rechazado', en_preparacion: 'En preparación', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
  const paymentLabels = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };
  const options = (values, current) => Object.entries(values).map(([key, value]) => `<option value="${key}"${key === current ? ' selected' : ''}>${value}</option>`).join('');
  const renderOrders = () => { const filter = $('#order-filter').value || 'all'; const rows = orders.filter((o) => filter === 'all' || o.status === filter); $('#order-count').textContent = `${rows.length} ${rows.length === 1 ? 'pedido' : 'pedidos'}`; $('#order-list').innerHTML = rows.length ? rows.map((o) => `<article class="adm-order" data-number="${esc(o.number)}"><details><summary><span class="adm-o-num">${esc(o.number)}</span><span class="adm-o-who">${esc(o.customer.name)}<small>${new Date(o.createdAt).toLocaleString('es-AR')}</small></span><span class="adm-o-total">${B.fmt(o.total)}</span><span class="adm-badge b-dark">${esc(statusLabels[o.status] || o.status)}</span></summary><div class="adm-o-body"><ul class="order-lines">${o.items.map((i) => `<li><span>${esc(i.name)}</span><span>× ${i.quantity}</span><span>${B.fmt(i.subtotal)}</span></li>`).join('')}</ul><p>${esc(o.customer.phone)} · ${esc(o.customer.email)}</p><div class="field-row"><div class="field"><label>Estado</label><select class="select" data-status>${options(statusLabels, o.status)}</select></div><div class="field"><label>Pago</label><select class="select" data-payment>${options(paymentLabels, o.payment.status)}</select></div></div></div></details></article>`).join('') : '<div class="empty"><p>No hay pedidos.</p></div>'; };
  const refreshOrders = async () => { const data = await api('/api/admin/orders'); orders = data.orders || []; $('#order-filter').innerHTML = `<option value="all">Todos los estados</option>${options(statusLabels, '')}`; renderOrders(); };
  $('#order-filter').addEventListener('change', renderOrders);
  $('#order-list').addEventListener('change', async (event) => { const card = event.target.closest('[data-number]'); if (!card) return; const body = event.target.matches('[data-status]') ? { status: event.target.value } : { paymentStatus: event.target.value }; try { await api(`/api/admin/orders?number=${encodeURIComponent(card.dataset.number)}`, { method: 'PATCH', body: JSON.stringify(body) }); await refreshOrders(); } catch (error) { errorMessage(error.message); } });
  $('#reset-demo').hidden = true;

  if (token()) { showApp(true); Promise.all([refreshProducts(), refreshOrders()]).catch(() => { sessionStorage.removeItem(TOKEN_KEY); showApp(false); }); } else showApp(false);
})();
