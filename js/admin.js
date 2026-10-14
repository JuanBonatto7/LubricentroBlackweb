/* ==========================================================
   BLACK – panel de administración (DEMO)
   Guarda en este navegador. Con backend, las funciones marcadas
   "PERSISTENCIA" se reemplazan por llamadas a /api/admin/*.
   ========================================================== */
(function () {
  'use strict';
  const B = window.BLACK;
  const { Catalog, fmt, esc, norm, storage, ORDER_STATUS, PAYMENT_STATUS } = B;
  const KEY = { catalog: 'black_admin_catalog_v1', orders: 'black_orders_v1', last: 'black_last_order_v1', seq: 'black_order_seq_v1', cart: 'black_cart_v1', session: 'black_admin_session' };
  const $ = (s, r = document) => r.querySelector(s);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- PERSISTENCIA (hoy: navegador) ---------- */
  function loadProducts() {
    const saved = storage.get(KEY.catalog, null);
    return saved && Array.isArray(saved.products) ? saved.products : clone(window.BLACK_PRODUCTS);
  }
  function saveProducts() { return storage.set(KEY.catalog, { products: products }); }
  const loadOrders = () => storage.get(KEY.orders, []);
  const saveOrders = (list) => storage.set(KEY.orders, list);

  let products = loadProducts();
  const categories = window.BLACK_CATEGORIES;
  const catName = (id) => (categories.find((c) => c.id === id) || {}).name || '—';

  /* ---------- Ingreso (de demostración) ---------- */
  const login = $('#login');
  const app = $('#app');
  function showApp(on) { login.hidden = on; app.hidden = !on; if (on) { renderProducts(); renderOrders(); } }
  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!$('#adm-pass').value.trim()) { $('#adm-pass').focus(); return; }
    sessionStorage.setItem(KEY.session, '1');
    showApp(true);
  });
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem(KEY.session); $('#adm-pass').value = ''; showApp(false); });

  /* ---------- Pestañas ---------- */
  const tabs = { productos: $('#tab-productos'), pedidos: $('#tab-pedidos') };
  function selectTab(name) {
    Object.entries(tabs).forEach(([k, el]) => {
      const on = k === name;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
      $('#panel-' + k).hidden = !on;
    });
    if (name === 'pedidos') renderOrders();
  }
  Object.entries(tabs).forEach(([k, el]) => el.addEventListener('click', () => selectTab(k)));

  /* ==========================================================
     PRODUCTOS
     ========================================================== */
  const list = $('#prod-list');
  const search = $('#prod-search');

  function thumb(p) {
    const art = p.art || { shape: 'bottle', color: '#e11d2e' };
    return `<div class="c-thumb"><svg class="p-art" style="--c:${esc(art.color)}" aria-hidden="true" focusable="false"><use href="#p-${esc(art.shape)}"/></svg>${p.image ? `<img class="p-photo" src="${esc(p.image)}" alt="">` : ''}</div>`;
  }

  function badges(p) {
    const out = [];
    if (p.active === false) out.push('<span class="adm-badge b-gray">Oculto</span>');
    if (p.soldOut || p.stock <= 0) out.push('<span class="adm-badge b-red">Sin stock</span>');
    else if (p.stock <= 5) out.push('<span class="adm-badge b-amber">Stock bajo</span>');
    if (p.featured) out.push('<span class="adm-badge b-dark">Destacado</span>');
    return out.join('');
  }

  function renderProducts() {
    const q = norm(search.value).trim();
    const rows = products.filter((p) => !q || norm(`${p.name} ${catName(p.category)}`).includes(q));
    $('#prod-count').textContent = rows.length === 1 ? '1 producto' : `${rows.length} productos`;
    if (!rows.length) { list.innerHTML = '<div class="empty"><p>No hay productos que coincidan.</p></div>'; return; }
    list.innerHTML = rows.map((p) => `
      <article class="adm-item${p.active === false ? ' is-hidden' : ''}">
        ${thumb(p)}
        <div class="adm-main-info">
          <p class="adm-name">${esc(p.name)}</p>
          <p class="adm-sub">${esc(catName(p.category))}</p>
        </div>
        <p class="adm-num"><span class="adm-lbl">Precio</span>${fmt(p.price)}</p>
        <p class="adm-num"><span class="adm-lbl">Stock</span>${p.stock}</p>
        <div class="adm-badges">${badges(p)}</div>
        <div class="adm-row-actions">
          <button class="btn btn-line" type="button" data-edit="${esc(p.id)}">Editar</button>
          <button class="btn btn-line adm-del" type="button" data-del="${esc(p.id)}" aria-label="Eliminar ${esc(p.name)}">Eliminar</button>
        </div>
      </article>`).join('');
  }
  search.addEventListener('input', renderProducts);

  list.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) openForm(products.find((p) => p.id === ed.dataset.edit));
    if (del) {
      const p = products.find((x) => x.id === del.dataset.del);
      if (p && window.confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) {
        products = products.filter((x) => x.id !== p.id);
        saveProducts();
        renderProducts();
      }
    }
  });

  /* --- Formulario --- */
  const dlg = $('#prod-dialog');
  const form = $('#prod-form');
  const catSelect = $('#p-cat');
  catSelect.innerHTML = categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  let editing = null;
  let imageData = '';

  function showPreview() {
    const p = { art: (editing && editing.art) || { shape: 'bottle', color: '#e11d2e' }, image: imageData };
    $('#p-preview').innerHTML = thumb(p).replace(/^<div class="c-thumb">|<\/div>$/g, '');
    $('#p-img-remove').hidden = !imageData;
  }

  function openForm(p) {
    editing = p || null;
    imageData = p && p.image ? p.image : '';
    $('#prod-dialog-title').textContent = p ? 'Editar producto' : 'Nuevo producto';
    form.elements.name.value = p ? p.name : '';
    form.elements.description.value = p ? p.description || '' : '';
    form.elements.price.value = p ? p.price : '';
    form.elements.stock.value = p ? p.stock : '';
    form.elements.category.value = p ? p.category : categories[0].id;
    form.elements.featured.checked = !!(p && p.featured);
    form.elements.soldOut.checked = !!(p && p.soldOut);
    form.elements.active.checked = p ? p.active !== false : true;
    ['name', 'price', 'stock'].forEach((k) => { $('#p-err-' + k).textContent = ''; form.elements[k].removeAttribute('aria-invalid'); });
    $('#p-form-error').textContent = '';
    $('#p-img-msg').textContent = 'Sin foto se muestra un envase genérico.';
    $('#p-file').value = '';
    showPreview();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    form.elements.name.focus();
  }
  $('#new-product').addEventListener('click', () => openForm(null));
  const closeForm = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
  $('#p-cancel').addEventListener('click', closeForm);

  /* Foto: se reduce a 600 px para que quepa en el almacenamiento del navegador */
  function toDataURL(file, max = 600) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  $('#p-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      imageData = await toDataURL(f);
      $('#p-img-msg').textContent = 'Foto lista. Se guarda al presionar "Guardar producto".';
      showPreview();
    } catch (err) {
      $('#p-img-msg').textContent = 'No pudimos leer esa imagen. Probá con otra (JPG o PNG).';
    }
  });
  $('#p-img-remove').addEventListener('click', () => { imageData = ''; $('#p-file').value = ''; showPreview(); });

  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'producto';
  function uniqueId(name) {
    const base = slug(name);
    let id = base; let n = 2;
    while (products.some((p) => p.id === id)) { id = `${base}-${n++}`; }
    return id;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const price = Number(form.elements.price.value);
    const stock = Number(form.elements.stock.value);
    const errs = {
      name: name.length < 2 ? 'Escribí el nombre del producto.' : '',
      price: form.elements.price.value === '' || !Number.isInteger(price) || price < 0 ? 'Ingresá un precio entero, en pesos.' : '',
      stock: form.elements.stock.value === '' || !Number.isInteger(stock) || stock < 0 ? 'Ingresá el stock como número entero.' : '',
    };
    let first = null;
    Object.keys(errs).forEach((k) => {
      $('#p-err-' + k).textContent = errs[k];
      if (errs[k]) { form.elements[k].setAttribute('aria-invalid', 'true'); first = first || form.elements[k]; } else form.elements[k].removeAttribute('aria-invalid');
    });
    if (first) { first.focus(); return; }

    const data = {
      id: editing ? editing.id : uniqueId(name),
      name, description: form.elements.description.value.trim(), price, stock,
      category: form.elements.category.value,
      featured: form.elements.featured.checked,
      soldOut: form.elements.soldOut.checked,
      active: form.elements.active.checked,
      image: imageData,
      art: (editing && editing.art) || { shape: 'bottle', color: '#e11d2e' },
    };
    const before = clone(products);
    if (editing) products = products.map((p) => (p.id === editing.id ? data : p));
    else products.unshift(data);
    if (!saveProducts()) {
      products = before;
      $('#p-form-error').textContent = 'No hay espacio para guardar. Probá con una foto más liviana o sin foto.';
      return;
    }
    closeForm();
    renderProducts();
  });

  /* ==========================================================
     PEDIDOS
     ========================================================== */
  const orderList = $('#order-list');
  const filter = $('#order-filter');
  filter.innerHTML = '<option value="all">Todos los estados</option>' + Object.entries(ORDER_STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  filter.addEventListener('change', renderOrders);

  const statusClass = (s) => ({ pendiente_pago: 'b-amber', pago_rechazado: 'b-red', cancelado: 'b-red', entregado: 'b-green', pago_aprobado: 'b-green' }[s] || 'b-dark');
  const opts = (map, current) => Object.entries(map).map(([k, v]) => `<option value="${k}"${k === current ? ' selected' : ''}>${v}</option>`).join('');

  function renderOrders() {
    const all = loadOrders().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pending = all.filter((o) => o.status === 'pendiente_pago' || o.status === 'en_preparacion').length;
    const badge = $('#orders-badge');
    badge.textContent = pending; badge.hidden = pending === 0;

    const rows = filter.value === 'all' ? all : all.filter((o) => o.status === filter.value);
    $('#order-count').textContent = rows.length === 1 ? '1 pedido' : `${rows.length} pedidos`;

    if (!all.length) {
      orderList.innerHTML = `<div class="empty empty-lg"><h2>Todavía no hay pedidos</h2><p>Hacé un pedido desde la tienda y va a aparecer acá.</p><button class="btn btn-line" type="button" id="seed-orders">Cargar pedidos de ejemplo</button></div>`;
      return;
    }
    if (!rows.length) { orderList.innerHTML = '<div class="empty"><p>No hay pedidos con ese estado.</p></div>'; return; }

    orderList.innerHTML = rows.map((o) => {
      const when = new Date(o.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
      return `
      <article class="adm-order" data-n="${esc(o.number)}">
        <details>
          <summary>
            <span class="adm-o-num">${esc(o.number)}</span>
            <span class="adm-o-who">${esc(o.customer.name)}<small>${esc(when)}</small></span>
            <span class="adm-o-total">${fmt(o.total)}</span>
            <span class="adm-badge ${statusClass(o.status)}" data-status-badge>${esc(ORDER_STATUS[o.status] || o.status)}</span>
          </summary>
          <div class="adm-o-body">
            <ul class="order-lines">${o.items.map((i) => `<li><span class="ol-name">${esc(i.name)}</span><span class="ol-qty">× ${i.quantity}</span><span class="ol-price">${fmt(i.subtotal)}</span></li>`).join('')}</ul>
            <p class="order-total"><span>Total</span><strong>${fmt(o.total)}</strong></p>
            <dl class="facts">
              <div><dt>Cliente</dt><dd>${esc(o.customer.name)} · ${esc(o.customer.phone)}<br>${esc(o.customer.email)}</dd></div>
              <div><dt>Entrega</dt><dd>${esc(o.delivery.label)}${o.delivery.address ? `<br>${esc(o.delivery.address)}` : ''}</dd></div>
              ${o.delivery.notes ? `<div><dt>Observaciones</dt><dd>${esc(o.delivery.notes)}</dd></div>` : ''}
            </dl>
            <div class="field-row">
              <div class="field"><label for="st-${esc(o.number)}">Estado del pedido</label><select class="select" id="st-${esc(o.number)}" data-set="status">${opts(ORDER_STATUS, o.status)}</select></div>
              <div class="field"><label for="pay-${esc(o.number)}">Estado del pago</label><select class="select" id="pay-${esc(o.number)}" data-set="payment">${opts(PAYMENT_STATUS, o.payment && o.payment.status)}</select></div>
            </div>
          </div>
        </details>
      </article>`;
    }).join('');
  }

  orderList.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-set]');
    if (!sel) return;
    const card = sel.closest('[data-n]');
    const all = loadOrders();
    const o = all.find((x) => x.number === card.dataset.n);
    if (!o) return;
    if (sel.dataset.set === 'status') {
      o.status = sel.value;
      const b = card.querySelector('[data-status-badge]');
      b.textContent = ORDER_STATUS[o.status];
      b.className = 'adm-badge ' + statusClass(o.status);
    } else {
      o.payment = Object.assign({}, o.payment, { status: sel.value });
    }
    saveOrders(all);
    const last = storage.get(KEY.last, null);
    if (last && last.number === o.number) storage.set(KEY.last, o);
    const pending = all.filter((x) => x.status === 'pendiente_pago' || x.status === 'en_preparacion').length;
    $('#orders-badge').textContent = pending; $('#orders-badge').hidden = pending === 0;
  });

  /* Pedidos de ejemplo para la demostración */
  function seedOrders() {
    const pick = (id) => products.find((p) => p.id === id) || products[0];
    const mk = (n, hoursAgo, who, phone, email, delivery, addr, lines, status, pay, notes) => {
      const items = lines.map(([id, q]) => { const p = pick(id); return { productId: p.id, name: p.name, unitPrice: p.price, quantity: q, subtotal: p.price * q }; });
      return {
        number: 'BK-' + String(n).padStart(6, '0'), createdAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
        customer: { name: who, phone, email },
        delivery: { method: delivery, label: delivery === 'envio' ? 'Envío a domicilio' : 'Retiro en el local', address: addr, notes: notes || '' },
        items, total: items.reduce((s, i) => s + i.subtotal, 0), status, payment: { status: pay, provider: null, providerPaymentId: null }, demo: true,
      };
    };
    const seeded = [
      mk(901, 2, 'María González', '358 412 5566', 'maria@correo.com', 'retiro', '', [['aceite-5w30', 1], ['filtro-aceite', 1]], 'pendiente_pago', 'pendiente', 'Paso a retirar a la tarde.'),
      mk(902, 26, 'Lucas Fernández', '358 600 1234', 'lucas.f@correo.com', 'envio', 'Belgrano 450, Río Cuarto', [['kit-lavado', 1], ['cera-liquida', 2]], 'en_preparacion', 'aprobado'),
      mk(903, 70, 'Carolina Ruiz', '358 555 9087', 'caro.ruiz@correo.com', 'retiro', '', [['microfibra-x3', 2], ['shampoo-neutro', 1]], 'entregado', 'aprobado'),
    ];
    saveOrders(loadOrders().concat(seeded));
    renderOrders();
  }
  orderList.addEventListener('click', (e) => { if (e.target.closest('#seed-orders')) seedOrders(); });

  /* ---------- Restablecer demo ---------- */
  $('#reset-demo').addEventListener('click', () => {
    if (!window.confirm('Se borran los productos editados, los pedidos y el carrito de este navegador. ¿Continuar?')) return;
    [KEY.catalog, KEY.orders, KEY.last, KEY.seq, KEY.cart].forEach((k) => { try { localStorage.removeItem(k); } catch (err) { /* ignorar */ } });
    products = clone(window.BLACK_PRODUCTS);
    search.value = ''; filter.value = 'all';
    renderProducts(); renderOrders();
  });

  /* Arranque (al final, cuando todo lo anterior ya está definido) */
  showApp(sessionStorage.getItem(KEY.session) === '1');
})();
