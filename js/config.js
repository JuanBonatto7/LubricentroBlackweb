/* ==========================================================
   BLACK – configuración de la tienda
   Todo lo que cambia entre "demo" y "producción" está acá.
   ========================================================== */
window.BLACK_CONFIG = {
  business: {
    name: 'BLACK Lubricentro y Cosmética Vehicular',
    // ⚠️ Datos de ejemplo: reemplazar por los reales.
    phone: '+54 9 358 123 4567',
    whatsapp: '5493581234567',          // formato internacional, sin + ni espacios
    instagram: 'black.lubricentro',
    address: 'Av. San Martín 1234',
    city: 'Río Cuarto, Córdoba',
    hours: [
      ['Lunes a viernes', '8:00 – 20:00'],
      ['Sábados', '8:00 – 14:00'],
    ],
  },

  /* MODO DEMO: sin backend los pedidos se guardan solo en el navegador del
     cliente (localStorage) y BLACK NO los recibe. Poner en false recién
     cuando `endpoints.orders` apunte a un backend real. */
  demoMode: true,

  /* URLs del backend (vacías = se usan los datos locales de js/products-data.js).
     Ver docs/PREPARACION-BACKEND.md para el contrato de cada endpoint. */
  endpoints: {
    products: '',           // GET  → { categories: [...], products: [...] }
    orders: '',             // POST → crea el pedido y devuelve { number, status, ... }
    paymentPreference: '',  // POST → { orderNumber } → { checkoutUrl } (Mercado Pago)
  },

  /* Pagos: 'none' hoy. Cambiar a 'mercadopago' cuando exista el backend que
     crea la preferencia de pago (no se puede hacer solo desde el navegador). */
  payments: { provider: 'none' },

  delivery: [
    { id: 'retiro', label: 'Retiro en el local', note: 'Sin costo. Te avisamos cuando tu pedido esté listo.', needsAddress: false },
    { id: 'envio', label: 'Envío a domicilio', note: 'El costo y la zona de entrega se coordinan con el local.', needsAddress: true },
  ],
};
