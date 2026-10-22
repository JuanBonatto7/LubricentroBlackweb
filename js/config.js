/* ==========================================================
   BLACK – configuración de la tienda
   Todo lo que cambia entre "demo" y "producción" está acá.
   ========================================================== */
window.BLACK_CONFIG = {
  business: {
    name: 'BLACK Lubricentro y Cosmética Vehicular',
    shortName: 'BLACK',
    // ⚠️ NÚMERO DE PRUEBA (Juan). Antes de publicar, cambiar phone y whatsapp por el del local.
    phone: '+54 9 358 654-8564',
    whatsapp: '5493586548564',          // a este número llegan los pedidos. Formato: 549 + característica + número, sin + ni espacios
    instagram: 'blackcardetail78',
    address: 'Av. Marcelo T. de Alvear 1961',
    city: 'Río Cuarto, Córdoba',
    hours: [
      ['Lunes a viernes', '8:00 – 12:30 y 16:00 – 20:00'],
      ['Sábados', '9:00 – 13:00'],
      ['Domingos', 'Cerrado'],
    ],
  },

  /* ---------- SUPABASE ----------
     1) Pegá tu Project URL entre las comillas (Project Settings → API).
     2) La clave publishable es pública: puede estar en la web.
     ⚠️ NUNCA pongas acá la clave "secret" ni la "service_role". */
  supabase: {
    url: 'https://kwuvkcsfkegsssdoqzua.supabase.co',
    anonKey: 'sb_publishable_qLZInxBm9sIcmRJmphOG_g_eBoPajqy',
  },

  /* Se desactiva solo cuando Supabase está bien configurado (ver js/store.js).
     Mientras la URL no esté puesta, la web sigue funcionando en modo demo. */
  demoMode: false,

  /* Ya no se usan con Supabase; quedan por si más adelante hay otro backend. */
  endpoints: {
    products: '',
    orders: '',
    paymentPreference: '',  // POST → { orderNumber } → { checkoutUrl } (Mercado Pago)
  },

  payments: {
    provider: 'none',
    /* Medios de pago que elige el cliente al hacer el pedido (se mandan en el mensaje de WhatsApp).
       ⚠️ Confirmar con el local cuáles acepta. El primero queda elegido por defecto. */
    methods: ['A coordinar por WhatsApp', 'Efectivo', 'Transferencia', 'Mercado Pago', 'Tarjeta de débito o crédito'],
  },

  delivery: [
    { id: 'retiro', label: 'Retiro en el local', note: 'Sin costo. Te avisamos por WhatsApp cuando esté listo.', needsAddress: false },
    { id: 'envio', label: 'Envío a domicilio', note: 'Solo dentro de Río Cuarto. El costo se coordina por WhatsApp.', needsAddress: true },
  ],
};
