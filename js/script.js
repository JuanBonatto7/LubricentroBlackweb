/* ==========================================================
   BLACK – lógica de cada página
   (carga después de config.js, products-data.js, store.js, layout.js)
   ========================================================== */
(function () {
  'use strict';
  const B = window.BLACK;
  const { cfg, Catalog, Cart, Orders, Payments, fmt, esc, norm, waLink, ORDER_STATUS, PAYMENT_STATUS } = B;
  const page = document.body.dataset.page;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Enlaces de WhatsApp (canal de consulta, no de pedidos) ---------- */
  $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });

  /* ---------- Tarjeta de producto ---------- */
  function stockInfo(p) {
    if (!Catalog.isAvailable(p)) return { cls: 'out', text: 'Sin stock' };
    if (p.stock <= 2) return { cls: 'low', text: p.stock === 1 ? 'Última unidad' : `Últimas ${p.stock} unidades` };
    return { cls: 'ok', text: 'Disponible' };
  }

  function mediaHTML(p) {
    const art = p.art || { shape: 'bottle', color: '#e11d2e' };
    const drawing = `<svg class="p-art" style="--c:${esc(art.color)}" aria-hidden="true" focusable="false"><use href="#p-${esc(art.shape)}"/></svg>`;
    const photo = p.image ? `<img class="p-photo" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="400" height="400">` : '';
    return drawing + photo;
  }

  /* Marca del producto: el logo o, si no tiene, el nombre (nunca los dos) */
  function brandHTML(p) {
    const name = Catalog.brandName(p.brand);
    if (!name) return '';
    const logo = Catalog.brandLogo(p.brand);
    return logo ? `<img class="p-brand-logo" src="${esc(logo)}" alt="${esc(name)}" loading="lazy" width="56" height="32">` : `<span class="p-brand">${esc(name)}</span>`;
  }

  const productURL = (p) => `/producto?id=${encodeURIComponent(p.id)}`;

  function productCard(p) {
    const s = stockInfo(p);
    const avail = Catalog.isAvailable(p);
    return `
    <article class="p-card${avail ? '' : ' is-out'}">
      <a class="p-media" href="${productURL(p)}" tabindex="-1" aria-hidden="true">${mediaHTML(p)}</a>
      <div class="p-body">
        <p class="p-cat">${esc(Catalog.categoryName(p.category))}</p>
        <h3 class="p-name"><a href="${productURL(p)}">${esc(p.name)}</a></h3>
        <div class="p-brandline">${brandHTML(p)}</div>
        <div class="p-meta">
          <span class="p-price">${fmt(p.price)}</span>
          <span class="stock stock-${s.cls}">${s.text}</span>
        </div>
        ${avail
          ? `<button class="btn btn-red btn-block" type="button" data-add="${esc(p.id)}" aria-label="Agregar ${esc(p.name)} al carrito"><svg class="ico" aria-hidden="true"><use href="#i-cart"/></svg><span>Agregar<span class="btn-more"> al carrito</span></span></button>`
          : `<button class="btn btn-block" type="button" disabled>Sin stock</button>`}
      </div>
    </article>`;
  }

  /* Imágenes que no cargan: se quita la foto y queda el dibujo del envase */
  document.addEventListener('error', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('p-photo')) e.target.remove();
  }, true);

  /* ---------- Compartir catálogo (página de productos) ---------- */
  const shareBtn = $('#share-catalog');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const r = await B.shareCatalog();
      if (r === 'copied') B.toast('Link del catálogo copiado.');
    });
  }

  /* ---------- Agregar al carrito (desde cualquier página) ---------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const p = Catalog.get(btn.dataset.add);
    const r = Cart.add(btn.dataset.add);
    if (r.ok) B.toast(`${p.name} agregado al carrito.`, { href: '/carrito', label: 'Ver carrito' });
    else B.toast(r.reason === 'max' ? 'Ya tenés en el carrito todo el stock disponible.' : 'Este producto está sin stock.');
  });

  /* ==========================================================
     INICIO
     ========================================================== */
  function initHome() {
    const cats = $('#home-categories');
    if (cats) {
      cats.innerHTML = Catalog.categories().map((c) => `
        <a class="cat-tile" href="/productos?categoria=${encodeURIComponent(c.id)}">
          <svg class="ico ico-lg" aria-hidden="true"><use href="#i-${esc(c.icon)}"/></svg>
          <span>${esc(c.name)}</span>
        </a>`).join('');
    }
    const feat = $('#home-featured');
    if (feat) {
      const list = Catalog.products().filter((p) => p.featured).sort((a, b) => Catalog.isAvailable(b) - Catalog.isAvailable(a)).slice(0, 8);
      feat.innerHTML = list.map(productCard).join('');
    }
    const brandsBox = $('#home-brands');
    const brandsList = Catalog.brands();
    if (brandsBox && brandsList.length) {
      const tile = (b) => `
        <a class="brand-tile" href="/productos?marca=${encodeURIComponent(b.id)}" aria-label="Ver productos ${esc(b.name)}">
          ${b.logo ? `<img src="${esc(b.logo)}" alt="${esc(b.name)}" loading="lazy">` : `<span class="brand-tile-name">${esc(b.name)}</span>`}
        </a>`;
      /* Con marcas de más de un rubro, se muestran agrupadas (Detailing, Lubricantes, Filtros) */
      const groups = Catalog.groupBrands(brandsList);
      if (groups.length > 1) {
        brandsBox.classList.remove('brand-grid');
        brandsBox.innerHTML = groups.map((g) => `
          <div class="brand-group">
            <h3 class="brand-group-title">${esc(g.name)}</h3>
            <div class="brand-grid">${g.brands.map(tile).join('')}</div>
          </div>`).join('');
      } else {
        brandsBox.innerHTML = brandsList.map(tile).join('');
      }
      $('#brands-section').hidden = false;
    }
  }

  /* ==========================================================
     PRODUCTOS (catálogo con búsqueda, categorías y orden)
     ========================================================== */
  function initCatalog() {
    const grid = $('#catalog-grid');
    const chips = $('#category-chips');
    const search = $('#catalog-search');
    const sort = $('#catalog-sort');
    const brandSel = $('#catalog-brand');
    const count = $('#catalog-count');
    const title = $('#catalog-title');
    const base = document.title;

    const params = new URLSearchParams(location.search);
    const validCat = (id) => Catalog.categories().some((c) => c.id === id);
    const state = {
      cat: validCat(params.get('categoria')) ? params.get('categoria') : 'all',
      q: params.get('q') || '',
      sort: ['precio-asc', 'precio-desc', 'nombre'].includes(params.get('orden')) ? params.get('orden') : 'destacados',
      brand: Catalog.brands().some((b) => b.id === params.get('marca')) ? params.get('marca') : 'all',
    };
    search.value = state.q;
    sort.value = state.sort;

    const all = Catalog.products();
    /* Filtro por marca: muestra solo las marcas con productos en la categoría elegida
       (agrupadas por rubro si hay más de uno). Si no hay ninguna, se oculta. */
    const inCat = (p) => state.cat === 'all' || p.category === state.cat;
    function renderBrandSelect() {
      if (!brandSel) return;
      const used = Catalog.brands().filter((b) => b.id === state.brand || all.some((p) => p.brand === b.id && inCat(p)));
      const opt = (b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`;
      const groups = Catalog.groupBrands(used);
      brandSel.closest('.toolbar-brand').hidden = used.length === 0;
      brandSel.innerHTML = '<option value="all">Todas las marcas</option>' + (groups.length > 1
        ? groups.map((g) => `<optgroup label="${esc(g.name)}">${g.brands.map(opt).join('')}</optgroup>`).join('')
        : used.map(opt).join(''));
      brandSel.value = state.brand;
    }
    if (brandSel) brandSel.addEventListener('change', () => { state.brand = brandSel.value; render(); });
    const countBy = (id) => all.filter((p) => id === 'all' || p.category === id).length;

    function renderChips() {
      const items = [{ id: 'all', name: 'Todas' }].concat(Catalog.categories().filter((c) => countBy(c.id) > 0));
      chips.innerHTML = items.map((c) => `<button type="button" class="chip${state.cat === c.id ? ' is-active' : ''}" data-cat="${esc(c.id)}" aria-pressed="${state.cat === c.id}">${esc(c.name)} <span>${countBy(c.id)}</span></button>`).join('');
    }

    function filtered() {
      const q = norm(state.q).trim();
      let list = all.filter((p) => (state.cat === 'all' || p.category === state.cat)
        && (state.brand === 'all' || p.brand === state.brand)
        && (!q || norm(`${p.name} ${p.description} ${Catalog.categoryName(p.category)} ${Catalog.brandName(p.brand)}`).includes(q)));
      const byName = (a, b) => a.name.localeCompare(b.name, 'es');
      if (state.sort === 'precio-asc') list.sort((a, b) => a.price - b.price);
      else if (state.sort === 'precio-desc') list.sort((a, b) => b.price - a.price);
      else if (state.sort === 'nombre') list.sort(byName);
      else list.sort((a, b) => (Catalog.isAvailable(b) - Catalog.isAvailable(a)) || ((b.featured ? 1 : 0) - (a.featured ? 1 : 0)) || byName(a, b));
      return list;
    }

    function render() {
      const list = filtered();
      renderChips();
      renderBrandSelect();
      count.textContent = list.length === 1 ? '1 producto' : `${list.length} productos`;
      if (!list.length) {
        const onlyBrand = state.brand !== 'all' && state.cat === 'all' && !state.q.trim();
        grid.innerHTML = onlyBrand
          ? `<div class="empty"><p><strong>Todavía no cargamos productos de ${esc(Catalog.brandName(state.brand))} en la web.</strong></p><p>Consultanos por WhatsApp: seguro lo tenemos en el local.</p><a class="btn btn-wa" href="${waLink(`Hola BLACK, quiero consultar por productos ${Catalog.brandName(state.brand)}.`)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg>Consultar por WhatsApp</a> <button type="button" class="btn btn-line" data-clear>Ver todos los productos</button></div>`
          : `<div class="empty"><p><strong>No encontramos productos con esa búsqueda.</strong></p><p>Probá con otra palabra o mirá todas las categorías.</p><button type="button" class="btn btn-line" data-clear>Ver todos los productos</button></div>`;
      } else {
        grid.innerHTML = list.map(productCard).join('');
      }
      const catName = state.cat === 'all' ? '' : Catalog.categoryName(state.cat);
      title.textContent = catName || 'Productos';
      document.title = catName ? `${catName} | ${base}` : base;
      const p = new URLSearchParams();
      if (state.cat !== 'all') p.set('categoria', state.cat);
      if (state.q.trim()) p.set('q', state.q.trim());
      if (state.sort !== 'destacados') p.set('orden', state.sort);
      if (state.brand !== 'all') p.set('marca', state.brand);
      try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { /* algunos navegadores lo bloquean en file:// */ }
    }

    chips.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      state.cat = b.dataset.cat;
      /* Si la marca elegida no tiene productos en la nueva categoría, se vuelve a "Todas las marcas" */
      if (state.brand !== 'all' && !all.some((p) => p.brand === state.brand && inCat(p))) state.brand = 'all';
      render();
      const active = chips.querySelector('.is-active');
      if (active) { active.focus({ preventScroll: true }); if (active.scrollIntoView) active.scrollIntoView({ inline: 'center', block: 'nearest' }); }
    });
    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = search.value; render(); }, 150); });
    $('#catalog-search-form').addEventListener('submit', (e) => { e.preventDefault(); state.q = search.value; render(); });
    sort.addEventListener('change', () => { state.sort = sort.value; render(); });
    grid.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) { state.cat = 'all'; state.q = ''; state.brand = 'all'; search.value = ''; if (brandSel) brandSel.value = 'all'; render(); }
    });

    render();

    /* Datos estructurados para buscadores (se generan desde el catálogo) */
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: all.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          description: p.description,
          category: Catalog.categoryName(p.category),
          ...(Catalog.brandName(p.brand) ? { brand: { '@type': 'Brand', name: Catalog.brandName(p.brand) } } : {}),
          offers: { '@type': 'Offer', priceCurrency: 'ARS', price: p.price, availability: Catalog.isAvailable(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
        },
      })),
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ==========================================================
     FICHA DE PRODUCTO (/producto?id=...)
     ========================================================== */
  function initProduct() {
    const root = $('#product-root');
    const p = Catalog.get(new URLSearchParams(location.search).get('id') || '');
    if (!p) {
      document.title = 'Producto no encontrado | BLACK Río Cuarto';
      root.innerHTML = `<div class="empty empty-lg"><h1>Producto no encontrado</h1><p>Puede que ya no esté a la venta o que el link haya cambiado.</p><a class="btn btn-red btn-lg" href="/productos">Ver productos</a></div>`;
      return;
    }
    const s = stockInfo(p);
    const avail = Catalog.isAvailable(p);
    const catName = Catalog.categoryName(p.category);
    const brand = Catalog.brandName(p.brand);
    const brandLogo = Catalog.brandLogo(p.brand);
    const facts = [].concat(brand ? [['Marca', brand]] : [], catName ? [['Categoría', catName]] : [], (p.specs || []).map((x) => [x.label, x.value]));
    const related = Catalog.products().filter((x) => x.id !== p.id && x.category === p.category)
      .sort((a, b) => (Catalog.isAvailable(b) - Catalog.isAvailable(a)) || ((b.brand === p.brand) - (a.brand === p.brand))).slice(0, 4);
    const waText = `Hola BLACK, quiero consultar por ${p.name}${brand ? ` (${brand})` : ''}.`;

    document.title = `${p.name} | BLACK Río Cuarto`;
    const metaDesc = $('meta[name="description"]');
    if (metaDesc && p.description) metaDesc.content = p.description.slice(0, 160);

    root.innerHTML = `
      <nav class="crumbs" aria-label="Ruta">
        <a href="/productos">Productos</a>
        ${catName ? `<span aria-hidden="true">›</span><a href="/productos?categoria=${encodeURIComponent(p.category)}">${esc(catName)}</a>` : ''}
      </nav>
      <article class="pd${avail ? '' : ' is-out'}">
        <div class="pd-gallery">
          ${p.image
            ? `<button class="p-media pd-media" type="button" id="pd-zoom" aria-label="Ampliar imagen de ${esc(p.name)}">${mediaHTML(p)}<span class="pd-zoom-hint" aria-hidden="true"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg>Ampliar</span></button>`
            : `<div class="p-media pd-media">${mediaHTML(p)}</div>`}
        </div>
        <div class="pd-info">
          ${brand ? `<a class="pd-brand" href="/productos?marca=${encodeURIComponent(p.brand)}">${brandLogo ? `<img class="p-brand-logo" src="${esc(brandLogo)}" alt="Ver productos ${esc(brand)}" width="56" height="32">` : `<span>${esc(brand)}</span>`}</a>` : ''}
          <h1 class="pd-name">${esc(p.name)}</h1>
          <p class="pd-price">${fmt(p.price)}</p>
          <p class="stock stock-${s.cls}">${s.text}</p>
          ${avail ? `
          <div class="pd-buy">
            <div class="pd-qty">
              <span class="label" id="pd-qty-label">Cantidad</span>
              <div class="stepper" role="group" aria-labelledby="pd-qty-label">
                <button type="button" data-step="-1" aria-label="Restar uno"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button>
                <output id="pd-qty" aria-live="polite">1</output>
                <button type="button" data-step="1" aria-label="Sumar uno"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button>
              </div>            </div>
            <button class="btn btn-red btn-lg btn-block" type="button" id="pd-add"><svg class="ico" aria-hidden="true"><use href="#i-cart"/></svg>Agregar al carrito</button>
            <button class="btn btn-lg btn-block" type="button" id="pd-buy-now">Comprar ahora</button>
          </div>`
          : `<button class="btn btn-lg btn-block" type="button" disabled>Sin stock</button>`}
          <a class="btn btn-wa btn-block pd-wa" href="${waLink(waText)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg>Consultar por WhatsApp</a>
          <ul class="pd-perks">
            <li><svg class="ico" aria-hidden="true"><use href="#i-pin"/></svg><span><strong>Retiro en el local sin costo.</strong> ${esc(cfg.business.address)}, ${esc(cfg.business.city)}.</span></li>
            <li><svg class="ico" aria-hidden="true"><use href="#i-car"/></svg><span><strong>Envío a domicilio</strong> dentro de Río Cuarto. El costo se coordina con el personal.</span></li>
            <li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg><span><strong>Pagás en efectivo o por transferencia.</strong> Con envío, solo transferencia.</span></li>
          </ul>
        </div>
        <div class="pd-details">
          <section class="card" aria-labelledby="pd-desc-t">
            <h2 id="pd-desc-t">Descripción</h2>
            ${p.description ? p.description.split(/\n{2,}/).map((par) => `<p class="pd-desc">${esc(par.trim())}</p>`).join('') : '<p class="fine">Consultanos por WhatsApp por más información de este producto.</p>'}
          </section>
          ${facts.length ? `
          <section class="card" aria-labelledby="pd-facts-t">
            <h2 id="pd-facts-t">Datos del producto</h2>
            <table class="pd-specs">
              <tbody>${facts.map(([k, v]) => (k ? `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>` : `<tr><td colspan="2">${esc(v)}</td></tr>`)).join('')}</tbody>
            </table>
          </section>` : ''}
        </div>
      </article>
      ${related.length ? `
      <section class="pd-related" aria-labelledby="pd-rel-t">
        <div class="section-head"><h2 id="pd-rel-t">También te puede interesar</h2>${catName ? `<a class="text-link" href="/productos?categoria=${encodeURIComponent(p.category)}">Ver ${esc(catName)}<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>` : ''}</div>
        <div class="product-grid">${related.map(productCard).join('')}</div>
      </section>` : ''}`;

    /* Cantidad y compra */
    let qty = 1;
    const out = $('#pd-qty');
    const syncQty = () => {
      if (!out) return;
      out.textContent = qty;
      $$('[data-step]', root).forEach((b) => { b.disabled = b.dataset.step < 0 ? qty <= 1 : qty >= p.stock; });
    };
    syncQty();
    root.addEventListener('click', (e) => {
      const step = e.target.closest('[data-step]');
      if (step) { qty = Math.min(p.stock, Math.max(1, qty + Number(step.dataset.step))); syncQty(); }
    });
    const addQty = () => {
      const before = Cart.qtyOf(p.id);
      const r = Cart.add(p.id, qty);
      return r.ok ? { ok: true, added: r.qty - before } : r;
    };
    const addBtn = $('#pd-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const r = addQty();
        if (r.ok) B.toast(r.added === 1 ? `${p.name} agregado al carrito.` : `Agregaste ${r.added} unidades de ${p.name}.`, { href: '/carrito', label: 'Ver carrito' });
        else B.toast(r.reason === 'max' ? 'Ya tenés en el carrito todo el stock disponible.' : 'Este producto está sin stock.');
      });
      $('#pd-buy-now').addEventListener('click', () => {
        const r = addQty();
        if (r.ok || r.reason === 'max') location.href = '/carrito';
        else B.toast('Este producto está sin stock.');
      });
    }

    /* Imagen ampliada */
    const zoomBtn = $('#pd-zoom');
    const dlg = $('#zoom-dialog');
    if (zoomBtn && dlg && dlg.showModal) {
      const img = $('#zoom-img');
      zoomBtn.addEventListener('click', () => {
        if (!zoomBtn.querySelector('.p-photo')) return;   // la foto no cargó: queda el dibujo
        img.src = p.image; img.alt = p.name;
        dlg.showModal();
      });
      $('#zoom-close').addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    }

    /* Datos estructurados para buscadores */
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description,
      category: catName,
      ...(p.image ? { image: new URL(p.image, location.href).href } : {}),
      ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
      offers: { '@type': 'Offer', priceCurrency: 'ARS', price: p.price, availability: avail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    });
    document.head.appendChild(ld);
  }

  /* ==========================================================
     CARRITO
     ========================================================== */
  function initCart() {
    const root = $('#cart-root');
    const bar = $('#sticky-bar');
    let focusAfter = null;

    function render(notes = []) {
      const lines = Cart.lines();
      const noteHTML = notes.length ? `<div class="notice" role="status">${notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : '';
      document.body.classList.toggle('has-bar', lines.length > 0);

      if (!lines.length) {
        bar.hidden = true;
        root.innerHTML = `${noteHTML}<div class="empty empty-lg"><svg class="ico ico-xl" aria-hidden="true"><use href="#i-cart"/></svg><h2>Tu carrito está vacío</h2><p>Sumá productos del catálogo y armá tu pedido.</p><a class="btn btn-red btn-lg" href="/productos">Ver productos</a></div>`;
        return;
      }
      const total = Cart.total();
      root.innerHTML = `
      ${noteHTML}
      <div class="cart-layout">
        <table class="cart-table">
          <caption class="sr-only">Productos en tu carrito</caption>
          <thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio</th><th scope="col">Subtotal</th></tr></thead>
          <tbody>
            ${lines.map((l) => `
            <tr>
              <td class="c-prod"><div class="c-inner">
                <div class="c-thumb">${mediaHTML(l.product)}</div>
                <div>
                  <p class="c-name"><a href="${productURL(l.product)}">${esc(l.product.name)}</a></p>
                  <button class="link-btn" type="button" data-remove="${esc(l.product.id)}">Quitar<span class="sr-only"> ${esc(l.product.name)} del carrito</span></button>
                </div>
              </div></td>
              <td class="c-qty" data-label="Cantidad">
                <div class="stepper" role="group" aria-label="Cantidad de ${esc(l.product.name)}">
                  <button type="button" data-qty="${esc(l.product.id)}" data-act="dec" aria-label="Restar uno"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button>
                  <output aria-live="polite">${l.qty}</output>
                  <button type="button" data-qty="${esc(l.product.id)}" data-act="inc" aria-label="Sumar uno"${l.qty >= l.product.stock ? ' disabled' : ''}><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button>
                </div>
              </td>
              <td class="c-price" data-label="Precio">${fmt(l.unitPrice)}</td>
              <td class="c-sub" data-label="Subtotal">${fmt(l.subtotal)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <aside class="summary" aria-label="Resumen del pedido">
          <h2>Resumen</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>${fmt(total)}</dd></div>
            <div class="total"><dt>TOTAL</dt><dd>${fmt(total)}</dd></div>
          </dl>
          <p class="fine">Si elegís envío a domicilio, el costo se coordina con el personal.</p>
          <a class="btn btn-red btn-lg btn-block summary-cta" href="/checkout">Continuar con el pedido</a>
          <a class="btn btn-line btn-block" href="/productos">Seguir comprando</a>
        </aside>
      </div>`;

      bar.hidden = false;
      bar.innerHTML = `<div><span class="bar-label">Total</span><strong>${fmt(total)}</strong></div><a class="btn btn-red btn-lg" href="/checkout">Continuar con el pedido</a>`;

      if (focusAfter) {
        const el = root.querySelector(`[data-qty="${focusAfter.id}"][data-act="${focusAfter.act}"]:not([disabled])`) || root.querySelector(`[data-qty="${focusAfter.id}"]:not([disabled])`);
        if (el) el.focus();
        focusAfter = null;
      }
    }

    root.addEventListener('click', (e) => {
      const q = e.target.closest('[data-qty]');
      const r = e.target.closest('[data-remove]');
      if (q) {
        const id = q.dataset.qty;
        focusAfter = { id, act: q.dataset.act };
        Cart.setQty(id, Cart.qtyOf(id) + (q.dataset.act === 'inc' ? 1 : -1));
        render();
      } else if (r) {
        Cart.remove(r.dataset.remove);
        render();
        const h = $('h1');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      }
    });

    render(Cart.reconcile());
  }

  /* ==========================================================
     CHECKOUT
     ========================================================== */
  function initCheckout() {
    const wrap = $('#checkout-wrap');
    const emptyBox = $('#checkout-empty');
    const form = $('#checkout-form');
    const summary = $('#order-summary');
    const bar = $('#sticky-bar');
    const addressField = $('#address-field');
    const formError = $('#form-error');
    let busy = false;

    const notes = Cart.reconcile();
    if (!Cart.lines().length) {
      wrap.hidden = true;
      emptyBox.hidden = false;
      bar.hidden = true;
      return;
    }
    document.body.classList.add('has-bar');

    /* Opciones de entrega desde la configuración */
    $('#delivery-options').innerHTML = cfg.delivery.map((d, i) => `
      <label class="choice">
        <input type="radio" name="delivery" value="${esc(d.id)}"${i === 0 ? ' checked' : ''}>
        <span class="choice-box"><strong>${esc(d.label)}</strong><small>${esc(d.note)}</small></span>
      </label>`).join('');
    const allPayMethods = (cfg.payments && cfg.payments.methods) || [];
    const payOptions = $('#payment-options');

    function renderSummary(noticeList = []) {
      const lines = Cart.lines();
      const total = Cart.total();
      summary.innerHTML = `
        ${noticeList.length ? `<div class="notice" role="status">${noticeList.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
        <ul class="order-lines">
          ${lines.map((l) => `<li><span class="ol-name">${esc(l.product.name)}</span><span class="ol-qty">× ${l.qty}</span><span class="ol-price">${fmt(l.subtotal)}</span></li>`).join('')}
        </ul>
        <p class="order-total"><span>Total</span><strong>${fmt(total)}</strong></p>`;
      bar.innerHTML = `<div><span class="bar-label">Total</span><strong>${fmt(total)}</strong></div><button class="btn btn-red btn-lg" type="submit" form="checkout-form">Confirmar pedido</button>`;
    }
    renderSummary(notes);

    const selectedDelivery = () => (form.querySelector('input[name="delivery"]:checked') || {}).value;
    const deliveryCfg = () => cfg.delivery.find((d) => d.id === selectedDelivery()) || {};
    const needsAddress = () => deliveryCfg().needsAddress;
    function syncAddress() { addressField.hidden = !needsAddress(); }

    /* Medios de pago según la entrega: con envío a domicilio, solo transferencia */
    function syncPayments() {
      const allowed = deliveryCfg().payments;
      const methods = Array.isArray(allowed) ? allPayMethods.filter((m) => allowed.includes(m)) : allPayMethods;
      const current = (form.querySelector('input[name="payment"]:checked') || {}).value;
      const pick = methods.includes(current) ? current : methods[0];
      payOptions.innerHTML = methods.map((m) => `
        <label class="choice">
          <input type="radio" name="payment" value="${esc(m)}"${m === pick ? ' checked' : ''}>
          <span class="choice-box"><strong>${esc(m)}</strong></span>
        </label>`).join('');
      payOptions.closest('.form-card').hidden = methods.length === 0;
      $('#payment-note').textContent = needsAddress()
        ? 'Con envío a domicilio el pago es solo por transferencia. Te pasamos los datos por WhatsApp. No se cobra nada en la web.'
        : 'Pagás en efectivo al retirar, o por transferencia. No se cobra nada en la web.';
    }
    form.addEventListener('change', (e) => { if (e.target.name === 'delivery') { syncAddress(); syncPayments(); } });
    syncAddress();
    syncPayments();

    const fields = {
      name: { el: form.elements.name, check: (v) => v.trim().length >= 3 && v.trim().includes(' ') ? '' : 'Escribí tu nombre y apellido.' },
      phone: { el: form.elements.phone, check: (v) => { const d = v.replace(/\D/g, ''); return d.length >= 8 && d.length <= 15 ? '' : 'Ingresá un teléfono válido, con código de área.'; } },
      address: { el: form.elements.address, check: (v) => (!needsAddress() || v.trim().length >= 5 ? '' : 'Ingresá la dirección de entrega.') },
    };
    const setFieldError = (key, msg) => {
      const f = fields[key];
      const box = $(`#err-${key}`);
      box.textContent = msg;
      if (msg) f.el.setAttribute('aria-invalid', 'true'); else f.el.removeAttribute('aria-invalid');
    };
    Object.keys(fields).forEach((k) => {
      fields[k].el.addEventListener('blur', () => { if (fields[k].el.value || fields[k].el.getAttribute('aria-invalid')) setFieldError(k, fields[k].check(fields[k].el.value)); });
      fields[k].el.addEventListener('input', () => { if (fields[k].el.getAttribute('aria-invalid')) setFieldError(k, fields[k].check(fields[k].el.value)); });
    });

    function validate() {
      let first = null;
      Object.keys(fields).forEach((k) => {
        const msg = fields[k].check(fields[k].el.value);
        setFieldError(k, msg);
        if (msg && !first) first = fields[k].el;
      });
      if (first) { first.focus(); return false; }
      return true;
    }

    function setBusy(v) {
      busy = v;
      $$('[type="submit"]').forEach((b) => { b.disabled = v; if (b.classList.contains('btn')) b.textContent = v ? 'Enviando…' : 'Confirmar pedido'; });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      formError.textContent = '';
      if (!validate()) return;

      /* El stock pudo cambiar mientras el cliente completaba sus datos */
      const changes = Cart.reconcile();
      if (changes.length) {
        if (!Cart.lines().length) { location.href = '/carrito'; return; }
        renderSummary(changes);
        formError.textContent = 'Algunos productos cambiaron de stock. Revisá tu pedido y confirmalo de nuevo.';
        return;
      }

      setBusy(true);
      let order;
      try {
        const data = {
          name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(),
          delivery: selectedDelivery(), address: form.elements.address.value.trim(), notes: form.elements.notes.value.trim(),
          payment: (form.querySelector('input[name="payment"]:checked') || {}).value || '',
        };
        order = await Orders.submit(Orders.buildPayload(data, Cart.lines()));
      } catch (err) {
        formError.textContent = 'No pudimos enviar tu pedido. Revisá tu conexión e intentá de nuevo.';
        setBusy(false);
        return;
      }
      try {
        const pay = await Payments.begin(order);
        if (pay.redirected) return;
        location.href = '/pedido';
      } catch (err) {
        location.href = '/pedido?pago=error';
      }
    });
  }

  /* ==========================================================
     CONFIRMACIÓN DEL PEDIDO
     ========================================================== */
  function initOrderDone() {
    const root = $('#order-root');
    const order = Orders.last();
    if (!order) {
      root.innerHTML = `<div class="empty empty-lg"><h2>No hay ningún pedido reciente</h2><p>Cuando confirmes un pedido, lo vas a ver acá.</p><a class="btn btn-red btn-lg" href="/productos">Ver productos</a></div>`;
      return;
    }
    const waHref = waLink(Orders.whatsappText(order));
    const when = new Date(order.createdAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
    const envio = order.delivery && order.delivery.method === 'envio';
    root.innerHTML = `
      <div class="done-head">
        <span class="done-icon"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg></span>
        <div>
          <h1 tabindex="-1" id="done-title">¡Pedido ${esc(order.number)} listo!</h1>
          <p>${esc(when)}</p>
        </div>
      </div>
      ${order.demo && cfg.demoMode ? `<div class="notice notice-warn" role="note"><p><strong>Modo demostración.</strong> Este pedido se guardó solo en este dispositivo.</p></div>` : ''}
      <section class="wa-step" aria-labelledby="wa-step-title">
        <h2 id="wa-step-title">Último paso: envialo por WhatsApp</h2>
        <p>Tu pedido <strong>todavía no le llegó al local</strong>. Tocá el botón, se abre WhatsApp con el pedido ya escrito y solo tenés que enviarlo. Ahí coordinamos ${envio ? 'el envío, ' : ''}el pago y ${envio ? 'la entrega' : 'el retiro'}.</p>
        <p class="fine">Te reservamos los productos por 24 horas. Si en ese tiempo el pedido no se confirma, se cancela solo.</p>
        <a class="btn btn-wa btn-lg" href="${waHref}" target="_blank" rel="noopener" id="wa-send"><svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg>Enviar pedido por WhatsApp</a>
      </section>
      <div class="done-grid">
        <section class="card" aria-labelledby="t-order">
          <h2 id="t-order">Tu pedido</h2>
          <ul class="order-lines">
            ${order.items.map((i) => `<li><span class="ol-name">${esc(i.name)}${i.brand ? ` <small class="ol-brand">${esc(i.brand)}</small>` : ''}</span><span class="ol-qty">× ${i.quantity}</span><span class="ol-price">${fmt(Number(i.subtotal))}</span></li>`).join('')}
          </ul>
          <p class="order-total"><span>Total</span><strong>${fmt(Number(order.total))}</strong></p>
          ${envio ? '<p class="fine">El costo del envío se suma después, por WhatsApp.</p>' : ''}
        </section>
        <section class="card" aria-labelledby="t-data">
          <h2 id="t-data">Detalles</h2>
          <dl class="facts">
            <div><dt>Nombre</dt><dd>${esc(order.customer.name)}</dd></div>
            <div><dt>Teléfono</dt><dd>${esc(order.customer.phone)}</dd></div>
            <div><dt>Entrega</dt><dd>${esc(order.delivery.label)}${order.delivery.address ? `<br>${esc(order.delivery.address)}` : ''}</dd></div>
            <div><dt>Medio de pago</dt><dd>${esc(order.paymentMethod || 'A coordinar')}</dd></div>
            ${order.delivery.notes ? `<div><dt>Observaciones</dt><dd>${esc(order.delivery.notes)}</dd></div>` : ''}
          </dl>
        </section>
      </div>
      <div class="actions-row"><a class="btn btn-line btn-lg" href="/productos">Seguir viendo productos</a></div>`;
    const h = $('#done-title');
    if (h) h.focus({ preventScroll: true });
  }

  /* ==========================================================
     CONTACTO
     ========================================================== */
  function initContact() {
    const b = cfg.business;
    const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${b.address}, ${b.city}`);
    const card = (href, icon, title, text, external) => `
      <${href ? 'a' : 'div'} class="contact-card"${href ? ` href="${esc(href)}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>
        <svg class="ico" aria-hidden="true"><use href="#i-${icon}"/></svg>
        <div><h2>${esc(title)}</h2><p>${text}</p></div>
      </${href ? 'a' : 'div'}>`;
    $('#contact-grid').innerHTML = [
      card('tel:' + b.phone.replace(/[^\d+]/g, ''), 'phone', 'Teléfono', `<strong>${esc(b.phone)}</strong>`),
      card(waLink('Hola BLACK, quiero hacer una consulta.'), 'chat', 'WhatsApp', 'Para consultas sobre productos y servicios.', true),
      card(maps, 'pin', 'Dirección', `${esc(b.address)}<br>${esc(b.city)}<br><strong>Cómo llegar</strong>`, true),
      card('https://instagram.com/' + b.instagram, 'insta', 'Instagram', `@${esc(b.instagram)}`, true),
      card('', 'clock', 'Horarios', b.hours.map(([d, h]) => `${esc(d)}: <strong>${esc(h)}</strong>`).join('<br>')),
    ].join('');
  }

  /* ---------- Arranque ---------- */
  /* Aviso cuando no se pudo leer el catálogo (base pausada o sin conexión) */
  function catalogErrorHTML() {
    return `<div class="empty empty-lg catalog-error" role="alert">
      <h2>No pudimos cargar los productos</h2>
      <p>Puede ser un problema momentáneo. Probá recargar en unos minutos o consultanos por WhatsApp.</p>
      <div class="actions-row" style="justify-content:center">
        <button type="button" class="btn btn-red" data-reload>Recargar</button>
        <a class="btn btn-wa" href="${waLink('Hola BLACK, quiero hacer una consulta.')}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg>Consultar por WhatsApp</a>
      </div>
    </div>`;
  }
  function showCatalogError() {
    const hide = (sel) => { const el = $(sel); if (el) el.hidden = true; };
    if (page === 'home') {
      const cats = $('#home-categories'); if (cats) cats.closest('section').hidden = true;
      const feat = $('#home-featured'); if (feat) { feat.innerHTML = catalogErrorHTML(); const link = feat.closest('section').querySelector('.section-head .text-link'); if (link) link.hidden = true; }
    } else if (page === 'productos') {
      ['#catalog-search-form', '#category-chips', '#catalog-count', '.page-head-row .btn-share'].forEach(hide);
      $('#catalog-grid').innerHTML = catalogErrorHTML();
    } else if (page === 'carrito') {
      hide('#sticky-bar');
      $('#cart-root').innerHTML = catalogErrorHTML();
    } else if (page === 'checkout') {
      hide('#checkout-wrap'); hide('#sticky-bar');
      const box = $('#checkout-empty'); box.hidden = false; box.outerHTML = catalogErrorHTML();
    }
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-reload]')) location.reload(); });

  Catalog.load().then(() => {
    if (Catalog.failed && ['home', 'productos', 'carrito', 'checkout'].includes(page)) { showCatalogError(); return; }
    if (page === 'home') initHome();
    else if (page === 'productos') initCatalog();
    else if (page === 'producto') initProduct();
    else if (page === 'carrito') initCart();
    else if (page === 'checkout') initCheckout();
    else if (page === 'pedido') initOrderDone();
    else if (page === 'contacto') initContact();
  });
})();
