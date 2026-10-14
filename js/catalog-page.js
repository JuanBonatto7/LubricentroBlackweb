(function () {
  const B = window.BLACK;
  const grid = document.querySelector('#catalog-grid');
  if (!B || !grid) return;
  const search = document.querySelector('#catalog-search');
  const sort = document.querySelector('#catalog-sort');
  const chips = document.querySelector('#category-chips');
  const count = document.querySelector('#catalog-count');
  let category = new URLSearchParams(location.search).get('categoria') || 'all';
  let products = [];

  const productArt = (p) => p.image ? `<img src="${B.esc(p.image)}" alt="" loading="lazy">` : `<svg aria-hidden="true"><use href="#p-${B.esc((p.art || {}).shape || 'bottle')}" style="--c:${B.esc((p.art || {}).color || '#e11d2e')}"></use></svg>`;
  const render = () => {
    const q = B.norm(search.value.trim());
    let rows = products.filter((p) => (category === 'all' || p.category === category) && (!q || B.norm(`${p.name} ${p.description}`).includes(q)));
    if (sort.value === 'precio-asc') rows.sort((a, b) => a.price - b.price);
    if (sort.value === 'precio-desc') rows.sort((a, b) => b.price - a.price);
    if (sort.value === 'nombre') rows.sort((a, b) => a.name.localeCompare(b.name));
    count.textContent = `${rows.length} ${rows.length === 1 ? 'producto' : 'productos'}`;
    grid.innerHTML = rows.length ? rows.map((p) => `<article class="product-card"><div class="product-visual">${productArt(p)}</div><div class="product-card-body"><p class="product-category">${B.esc(B.Catalog.categoryName(p.category))}</p><h2>${B.esc(p.name)}</h2><p>${B.esc(p.description)}</p><strong>${B.fmt(p.price)}</strong><button class="btn btn-red btn-block" type="button" data-add="${B.esc(p.id)}" ${B.Catalog.isAvailable(p) ? '' : 'disabled'}>${B.Catalog.isAvailable(p) ? 'Agregar al carrito' : 'Sin stock'}</button></div></article>`).join('') : '<div class="empty empty-lg"><h2>No encontramos productos</h2><p>Probá con otra búsqueda o categoría.</p></div>';
  };
  const renderChips = () => { chips.innerHTML = [['all', 'Todos'], ...B.Catalog.categories().map((c) => [c.id, c.name])].map(([id, label]) => `<button type="button" class="chip${category === id ? ' is-active' : ''}" data-category="${B.esc(id)}" aria-pressed="${category === id}">${B.esc(label)}</button>`).join(''); };
  chips.addEventListener('click', (e) => { const button = e.target.closest('[data-category]'); if (!button) return; category = button.dataset.category; renderChips(); render(); });
  search.addEventListener('input', render); sort.addEventListener('change', render);
  grid.addEventListener('click', (e) => { const button = e.target.closest('[data-add]'); if (!button) return; const result = B.Cart.add(button.dataset.add); B.toast(result.ok ? 'Producto agregado al carrito.' : 'No hay stock disponible.', { href: 'carrito.html', label: 'Ver carrito' }); });
  B.Catalog.load().then(() => { products = B.Catalog.products(); renderChips(); render(); }).catch((error) => { grid.innerHTML = `<div class="empty empty-lg"><h2>No pudimos cargar el catálogo</h2><p>${B.esc(error.message)}</p></div>`; });
})();
