(function () {
  const B = window.BLACK;
  const grid = document.querySelector('.products-section .product-grid');
  if (!B || !grid) return;
  const render = () => {
    const products = B.Catalog.products().filter((p) => p.featured).slice(0, 4);
    if (!products.length) return;
    grid.innerHTML = products.map((p) => `<article class="product-card"><div class="product-art"><svg aria-hidden="true"><use href="#p-${B.esc((p.art || {}).shape || 'bottle')}" style="--c:${B.esc((p.art || {}).color || '#e11d2e')}"></use></svg></div><div class="product-body"><h3>${B.esc(p.name)}</h3><p>${B.esc(p.description)}</p><strong class="price">${B.fmt(p.price)}</strong><button class="btn btn-line btn-block" type="button" data-add="${B.esc(p.id)}">Agregar al carrito</button></div></article>`).join('');
  };
  grid.addEventListener('click', (event) => { const button = event.target.closest('[data-add]'); if (!button) return; const result = B.Cart.add(button.dataset.add); B.toast(result.ok ? 'Producto agregado al carrito.' : 'No hay stock disponible.', { href: 'carrito.html', label: 'Ver carrito' }); });
  B.Catalog.load().then(render).catch(() => { grid.insertAdjacentHTML('beforebegin', '<p class="catalog-error">No pudimos cargar los productos destacados.</p>'); });
})();
