# BLACK – backend Supabase + Netlify

La integración actual usa Netlify Functions y Supabase PostgreSQL. El sitio no incorpora pagos online.

## Puesta en marcha

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` desde SQL Editor.
3. Ejecutar `supabase/seed.sql` para cargar categorías y productos demo.
4. Crear una cuenta en Supabase Auth > Users.
5. Reemplazar el UUID y email de `supabase/admin-user.sql` y ejecutarlo.
6. Configurar en Netlify: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y opcionalmente `ALLOWED_ORIGIN`.
7. En local usar `.env` basado en `.env.example` y ejecutar `npx netlify dev`.

La service role key nunca se carga en HTML ni JavaScript público. El navegador recibe solo el catálogo activo, crea pedidos mediante una RPC y usa un JWT de Supabase únicamente para operaciones administrativas.

## Endpoints

| Ruta | Método | Acceso | Función |
|---|---|---|---|
| `/api/products` | GET | Público | Productos activos y categorías |
| `/api/orders` | POST | Público validado | Crea pedido, recalcula total y descuenta stock |
| `/api/admin/auth` | POST | Público controlado | Login de Supabase Auth + comprobación de `admin_users` |
| `/api/admin/products` | GET/POST/PATCH/DELETE | Admin JWT | CRUD de productos; DELETE desactiva |
| `/api/admin/orders` | GET/PATCH | Admin JWT | Lista pedidos y actualiza estado/pago |

La creación de pedidos usa `Idempotency-Key` y la función PostgreSQL `create_order`. Los precios se leen desde `products`, el stock se bloquea con `FOR UPDATE` y el total se recalcula en servidor. `update_order_status` devuelve el stock una sola vez al cancelar y no permite reabrir pedidos cancelados.

## Dónde estamos hoy

La versión inicial era 100 % estática (HTML, CSS, JS). Esa tabla explica qué se reemplazó con la integración actual:

| Qué | Hoy | Consecuencia |
|---|---|---|
| Productos, precios, stock | `js/products-data.js` | Se edita a mano; el stock no baja solo |
| Carrito | `localStorage` del cliente | Correcto: el carrito siempre vive en el navegador |
| Pedidos | `localStorage` del cliente | **BLACK no los recibe.** Solo sirve para demostrar |
| Pagos | No hay | El pago se coordina con el local |

`js/config.js` concentra los interruptores: `demoMode`, `endpoints.*` y `payments.provider`.
La interfaz (`js/script.js`) no cambia al pasar a producción: solo se reemplaza lo que hay detrás de `Catalog.load()`, `Orders.submit()` y `Payments.begin()` en `js/store.js`.

## Contratos de referencia de la demo

Cualquier backend que exponga estos endpoints sirve (Spring Boot + MySQL, Node, o un servicio como Supabase/Firebase).

| Endpoint | Para qué |
|---|---|
| `GET /api/products` | Devuelve `{ categories: [...], products: [...] }` con el mismo formato que `products-data.js` |
| `POST /api/orders` | Recibe el pedido (formato de `Orders.buildPayload`). **Recalcula precios y total con la base de datos**, verifica y descuenta stock, asigna número y estado `pendiente_pago`. Devuelve el pedido |
| `POST /api/payments/preference` | Recibe `{ orderNumber }`, crea la preferencia de Mercado Pago y devuelve `{ checkoutUrl }` |
| `POST /api/payments/webhook` | Lo llama Mercado Pago; consulta el pago, actualiza `payment.status` y `status` del pedido |
| `/api/admin/*` (con login) | CRUD de productos y categorías, listado y cambio de estado de pedidos |

**Regla de seguridad:** el navegador nunca es fuente de verdad. El precio y el total que viajan en el pedido son solo informativos; el servidor los vuelve a calcular.

La configuración actual ya usa `demoMode: false` y `endpoints.products/orders` apuntan a `/api/products` y `/api/orders`. El endpoint de pagos queda vacío porque no se implementó una pasarela.

## Modelo de datos sugerido (MySQL)

```sql
CREATE TABLE categories (
  id VARCHAR(60) PRIMARY KEY, name VARCHAR(120) NOT NULL, icon VARCHAR(30), sort_order INT DEFAULT 0
);
CREATE TABLE products (
  id VARCHAR(80) PRIMARY KEY, name VARCHAR(160) NOT NULL, description VARCHAR(255),
  price DECIMAL(12,2) NOT NULL, stock INT NOT NULL DEFAULT 0, sold_out BOOLEAN DEFAULT FALSE,
  category_id VARCHAR(60) NOT NULL, featured BOOLEAN DEFAULT FALSE, active BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(255), FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, number VARCHAR(20) UNIQUE NOT NULL, created_at DATETIME NOT NULL,
  customer_name VARCHAR(160), customer_phone VARCHAR(30), customer_email VARCHAR(160),
  delivery_method ENUM('retiro','envio') NOT NULL, delivery_address VARCHAR(255), notes TEXT,
  total DECIMAL(12,2) NOT NULL,
  status ENUM('pendiente_pago','pago_aprobado','pago_rechazado','en_preparacion','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente_pago',
  payment_status ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  payment_provider VARCHAR(30), provider_payment_id VARCHAR(80)
);
CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, order_id BIGINT NOT NULL, product_id VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL, unit_price DECIMAL(12,2) NOT NULL, quantity INT NOT NULL, subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

Los pedidos guardan nombre y precio del producto en el momento de la compra (`order_items`), así un cambio posterior de precio no altera pedidos viejos.

## Mercado Pago – flujo previsto

1. Cliente confirma → `POST /api/orders` (estado `pendiente_pago`).
2. `Payments.begin()` llama a `POST /api/payments/preference` → el backend crea la preferencia con el **Access Token (secreto, solo en el servidor)**, usando `external_reference = número de pedido` y `back_urls` a `pedido.html`.
3. El cliente es redirigido al checkout de Mercado Pago y vuelve a `pedido.html`.
4. El **webhook** confirma el pago y pasa el pedido a `pago_aprobado` o `pago_rechazado`. La página de retorno es informativa: el estado real lo define el webhook.

Esto no está probado: depende de tener cuenta de Mercado Pago, credenciales y el backend.

## Administración histórica

- `js/products-data.js` conserva la semilla local de la demo.
- El panel actual usa Supabase Auth y `/api/admin/*`; eliminar desactiva productos para conservar el historial.

## Checklist para publicar

- [x] Backend con productos, pedidos y panel de administración
- [x] `demoMode: false` y endpoints configurados
- [ ] Mercado Pago (no implementado por decisión del proyecto)
- [ ] Email de confirmación al cliente y aviso de pedido nuevo al local (lo envía el backend)
- [ ] Datos reales en `config.js`: teléfono, WhatsApp, dirección, Instagram, horarios
- [ ] Fotos reales en `assets/products/` y catálogo real
- [ ] Reemplazar `TU-DOMINIO` en `sitemap.xml` y `robots.txt`; revisar el JSON-LD de `index.html`
- [ ] Definir costos y zonas de envío, política de cambios y términos (texto legal)
- [ ] HTTPS y dominio propio
- [ ] Probar una compra completa desde un celular real
