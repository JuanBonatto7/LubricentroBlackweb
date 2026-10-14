(function () {
  const B = window.BLACK;
  const root = document.querySelector('#cart-root');
  if (!B || !root) return;
  const money = (n) => B.fmt(n);
  const render = () => {
    const notes = B.Cart.reconcile();
    const lines = B.Cart.lines();
    if (!lines.length) { root.innerHTML = '<div class="empty empty-lg"><h2>Tu carrito está vacío</h2><p>Agregá productos del catálogo para continuar.</p><a class="btn btn-red btn-lg" href="productos.html">Ver productos</a></div>'; return; }
    root.innerHTML = `<div class="cart-layout"><div class="cart-lines">${notes.map((n) => `<p class="notice">${B.esc(n)}</p>`).join('')}${lines.map((l) => `<article class="cart-line"><div class="cart-line-art" aria-hidden="true"><svg><use href="#p-${B.esc((l.product.art || {}).shape || 'bottle')}" style="--c:${B.esc((l.product.art || {}).color || '#e11d2e')}"></use></svg></div><div><h2>${B.esc(l.product.name)}</h2><p>${B.esc(l.product.description)}</p><strong>${money(l.unitPrice)}</strong></div><label>Cantidad <input class="cart-qty" data-qty="${B.esc(l.product.id)}" type="number" min="1" max="${l.product.stock}" value="${l.qty}"></label><button class="link-btn" type="button" data-remove="${B.esc(l.product.id)}">Quitar</button></article>`).join('')}</div><aside class="card cart-summary"><h2>Resumen</h2><p><span>Subtotal</span><strong>${money(B.Cart.total())}</strong></p><a class="btn btn-red btn-lg btn-block" href="checkout.html">Continuar pedido</a></aside></div>`;
  };
  root.addEventListener('change', (e) => { if (e.target.matches('[data-qty]')) { B.Cart.setQty(e.target.dataset.qty, Number(e.target.value)); render(); } });
  root.addEventListener('click', (e) => { const button = e.target.closest('[data-remove]'); if (button) { B.Cart.remove(button.dataset.remove); render(); } });
  document.addEventListener('cart:change', render); render();
})();
