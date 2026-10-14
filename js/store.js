/* ==========================================================
   BLACK – capa de datos de la tienda
   Catálogo · Carrito · Pedidos · Pagos

   Cada bloque tiene UN solo punto donde hoy se usa el navegador
   (localStorage) y mañana se usará el backend. La interfaz
   (js/script.js) no necesita cambios cuando eso ocurra.
   ========================================================== */
(function () {
  'use strict';

  const cfg = window.BLACK_CONFIG;
  const KEYS = { cart: 'black_cart_v1', orders: 'black_orders_v1', last: 'black_last_order_v1', seq: 'black_order_seq_v1' };

  /* Estados que debe manejar el backend / panel de administración */
  const ORDER_STATUS = {
    pendiente_pago: 'Pendiente de pago',
    pago_aprobado: 'Pago aprobado',
    pago_rechazado: 'Pago rechazado',
    en_preparacion: 'En preparación',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };
  const PAYMENT_STATUS = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };

  /* ---------- Utilidades ---------- */
  const storage = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
  };
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmt = (n) => money.format(n).replace(/\u00a0/g, ' ');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const waLink = (text) => `https://wa.me/${cfg.business.whatsapp}` + (text ? `?text=${encodeURIComponent(text)}` : '');

  /* ---------- Catálogo ---------- */
  const Catalog = {
    /* Hoy: datos locales. Con backend: define endpoints.products y se cargan acá. */
    load() {
      if (!cfg.endpoints.products) {
        /* DEMO: si se editó el catálogo desde admin.html, se usa esa versión
           (guardada en este navegador). Con backend esto desaparece. */
        const saved = storage.get('black_admin_catalog_v1', null);
        if (saved && Array.isArray(saved.products)) window.BLACK_PRODUCTS = saved.products;
        return Promise.resolve();
      }
      return fetch(cfg.endpoints.products)
        .then((r) => { if (!r.ok) throw new Error('catalog'); return r.json(); })
        .then((d) => {
          window.BLACK_PRODUCTS = d.products || d;
          if (d.categories) window.BLACK_CATEGORIES = d.categories;
        })
        .catch(() => { throw new Error('No pudimos cargar el catálogo. Revisá la conexión e intentá nuevamente.'); });
    },
    categories() { return window.BLACK_CATEGORIES || []; },
    products() { return (window.BLACK_PRODUCTS || []).filter((p) => p.active !== false); },
    get(id) { return this.products().find((p) => p.id === id); },
    categoryName(id) { const c = this.categories().find((x) => x.id === id); return c ? c.name : ''; },
    isAvailable(p) { return !p.soldOut && p.stock > 0; },
  };

  /* ---------- Carrito (persiste en localStorage entre páginas) ---------- */
  const Cart = {
    _read() {
      const v = storage.get(KEYS.cart, []);
      return Array.isArray(v) ? v.filter((i) => i && typeof i.id === 'string' && Number.isInteger(i.qty) && i.qty > 0) : [];
    },
    _write(items) {
      storage.set(KEYS.cart, items);
      document.dispatchEvent(new CustomEvent('cart:change'));
    },
    /* Cantidad total, sin depender del catálogo (para el contador del header). */
    count() { return this._read().reduce((n, i) => n + i.qty, 0); },
    qtyOf(id) { const it = this._read().find((i) => i.id === id); return it ? it.qty : 0; },
    /* Líneas con datos actuales del catálogo: el precio nunca se guarda en el carrito. */
    lines() {
      return this._read()
        .map((i) => {
          const p = Catalog.get(i.id);
          return p ? { product: p, qty: i.qty, unitPrice: p.price, subtotal: p.price * i.qty } : null;
        })
        .filter(Boolean);
    },
    total() { return this.lines().reduce((sum, l) => sum + l.subtotal, 0); },
    add(id, qty = 1) {
      const p = Catalog.get(id);
      if (!p || !Catalog.isAvailable(p)) return { ok: false, reason: 'sin_stock' };
      const items = this._read();
      const it = items.find((i) => i.id === id);
      const current = it ? it.qty : 0;
      if (current >= p.stock) return { ok: false, reason: 'max' };
      const next = Math.min(current + qty, p.stock);
      if (it) it.qty = next; else items.push({ id, qty: next });
      this._write(items);
      return { ok: true, qty: next };
    },
    setQty(id, qty) {
      if (qty <= 0) return this.remove(id);
      const p = Catalog.get(id);
      if (!p) return this.remove(id);
      const items = this._read();
      const it = items.find((i) => i.id === id);
      if (!it) return;
      it.qty = Math.min(qty, p.stock);
      this._write(items);
    },
    remove(id) { this._write(this._read().filter((i) => i.id !== id)); },
    clear() { this._write([]); },
    /* Ajusta el carrito al stock actual. Devuelve avisos para mostrar al cliente. */
    reconcile() {
      const notes = [];
      const out = [];
      this._read().forEach((i) => {
        const p = Catalog.get(i.id);
        if (!p || !Catalog.isAvailable(p)) { notes.push(`${p ? p.name : 'Un producto'} ya no está disponible y lo quitamos del carrito.`); return; }
        if (i.qty > p.stock) { notes.push(`Ajustamos ${p.name} al stock disponible (${p.stock}).`); out.push({ id: i.id, qty: p.stock }); return; }
        out.push(i);
      });
      if (notes.length) this._write(out);
      return notes;
    },
  };

  /* ---------- Pedidos ---------- */
  const nextNumber = () => {
    const n = (storage.get(KEYS.seq, 0) || 0) + 1;
    storage.set(KEYS.seq, n);
    return 'BK-' + String(n).padStart(6, '0');
  };

  const Orders = {
    /* Arma el pedido con un "snapshot" de nombres y precios: si el catálogo
       cambia después, el pedido conserva lo que el cliente vio y aceptó. */
    buildPayload(form, lines) {
      const items = lines.map((l) => ({ productId: l.product.id, name: l.product.name, unitPrice: l.unitPrice, quantity: l.qty, subtotal: l.subtotal }));
      const method = cfg.delivery.find((d) => d.id === form.delivery) || cfg.delivery[0];
      return {
        customer: { name: form.name, phone: form.phone, email: form.email },
        delivery: { method: method.id, label: method.label, address: method.needsAddress ? form.address : '', notes: form.notes },
        items,
        total: items.reduce((s, i) => s + i.subtotal, 0),
      };
    },
    /* Hoy (demo): guarda en el navegador. Con backend: POST a endpoints.orders;
       el servidor asigna número, estado inicial y descuenta stock. */
    async submit(payload) {
      let order;
      if (cfg.endpoints.orders) {
        const clientRequestId = payload.clientRequestId || (crypto.randomUUID ? crypto.randomUUID() : `black-${Date.now()}-${Math.random().toString(16).slice(2)}`);
        const requestPayload = Object.assign({}, payload, { clientRequestId });
        const res = await fetch(cfg.endpoints.orders, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': clientRequestId }, body: JSON.stringify(requestPayload) });
        if (!res.ok) throw new Error('orders');
        order = await res.json();
      } else {
        order = Object.assign({}, payload, {
          number: nextNumber(),
          createdAt: new Date().toISOString(),
          status: 'pendiente_pago',
          payment: { status: 'pendiente', provider: null, providerPaymentId: null },
          demo: true,
        });
        storage.set(KEYS.orders, storage.get(KEYS.orders, []).concat(order));
      }
      storage.set(KEYS.last, order);
      Cart.clear();
      return order;
    },
    last() { return storage.get(KEYS.last, null); },
  };

  /* ---------- Pagos ---------- */
  /* Estructura lista para Mercado Pago. NO hay integración real todavía:
     requiere un backend que cree la preferencia de pago con el Access Token
     (secreto) y reciba el webhook de confirmación. Ver docs/. */
  const Payments = {
    enabled() { return cfg.payments.provider === 'mercadopago' && !!cfg.endpoints.paymentPreference; },
    async begin(order) {
      if (!this.enabled()) return { redirected: false };
      const res = await fetch(cfg.endpoints.paymentPreference, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber: order.number }) });
      if (!res.ok) throw new Error('payment');
      const data = await res.json();
      if (!data.checkoutUrl) throw new Error('payment');
      window.location.assign(data.checkoutUrl);
      return { redirected: true };
    },
  };

  /* Si falta assets/logo/logo.png, se muestra el nombre en texto en vez de una imagen rota */
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('brand-logo')) {
      const span = document.createElement('span');
      span.className = 'brand-text';
      span.textContent = 'BLACK';
      t.replaceWith(span);
    }
  }, true);

  window.BLACK = { cfg, Catalog, Cart, Orders, Payments, ORDER_STATUS, PAYMENT_STATUS, fmt, esc, norm, waLink, storage };
})();
