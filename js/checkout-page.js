(function () {
  const B = window.BLACK;
  const form = document.querySelector('#checkout-form');
  if (!B || !form) return;
  const empty = document.querySelector('#checkout-empty');
  const wrap = document.querySelector('#checkout-wrap');
  const summary = document.querySelector('#order-summary');
  const error = document.querySelector('#form-error');
  const addressField = document.querySelector('#address-field');
  const options = document.querySelector('#delivery-options');
  let lines = [];
  const render = () => { lines = B.Cart.lines(); if (!lines.length) { empty.hidden = false; wrap.hidden = true; return; } summary.innerHTML = lines.map((l) => `<p><span>${B.esc(l.product.name)} × ${l.qty}</span><strong>${B.fmt(l.subtotal)}</strong></p>`).join('') + `<hr><p><span>Total</span><strong>${B.fmt(B.Cart.total())}</strong></p>`; options.innerHTML = B.cfg.delivery.map((d, i) => `<label class="choice"><input type="radio" name="delivery" value="${B.esc(d.id)}"${i === 0 ? ' checked' : ''}><span><b>${B.esc(d.label)}</b><small>${B.esc(d.note)}</small></span></label>`).join(''); };
  options.addEventListener('change', () => { const selected = B.cfg.delivery.find((d) => d.id === form.elements.delivery.value); addressField.hidden = !selected?.needsAddress; });
  form.addEventListener('submit', async (event) => { event.preventDefault(); error.textContent = ''; const data = Object.fromEntries(new FormData(form)); const method = B.cfg.delivery.find((d) => d.id === data.delivery); if (!data.name.trim() || data.phone.replace(/\D/g, '').length < 8 || !data.email.includes('@') || (method.needsAddress && data.address.trim().length < 5)) { error.textContent = 'Completá correctamente tus datos y la entrega.'; return; } const payload = B.Orders.buildPayload(data, lines); payload.clientRequestId = crypto.randomUUID ? crypto.randomUUID() : `black-${Date.now()}`; const submit = form.querySelector('[type="submit"]'); submit.disabled = true; submit.textContent = 'Enviando…'; try { const order = await B.Orders.submit(payload); location.href = `pedido.html?numero=${encodeURIComponent(order.number)}`; } catch (err) { error.textContent = err.message.includes('orders') ? 'No pudimos registrar el pedido. Revisá tu conexión e intentá nuevamente.' : err.message; submit.disabled = false; submit.textContent = 'Confirmar pedido'; } });
  B.Catalog.load().then(() => { B.Cart.reconcile(); render(); }).catch(() => { error.textContent = 'No pudimos validar el catálogo. Recargá la página.'; });
})();
