(function () {
  const B = window.BLACK;
  const root = document.querySelector('#order-root');
  if (!B || !root) return;
  const order = B.Orders.last();
  if (!order) { root.innerHTML = '<div class="empty empty-lg"><h2>No encontramos el pedido</h2><p>La confirmación se puede consultar desde el dispositivo donde se realizó la compra.</p><a class="btn btn-red" href="productos.html">Volver al catálogo</a></div>'; return; }
  root.innerHTML = `<div class="order-confirmation"><p class="eyebrow">Pedido recibido</p><h1>Gracias por tu compra.</h1><p>Tu pedido <strong>${B.esc(order.number)}</strong> fue registrado correctamente. BLACK coordinará la entrega o retiro con vos.</p><dl>${order.items.map((item) => `<div><dt>${B.esc(item.name)} × ${item.quantity}</dt><dd>${B.fmt(item.subtotal)}</dd></div>`).join('')}<div><dt>Total</dt><dd>${B.fmt(order.total)}</dd></div></dl><a class="btn btn-red btn-lg" href="productos.html">Seguir comprando</a></div>`;
})();
