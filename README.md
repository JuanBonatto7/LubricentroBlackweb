# BLACK Lubricentro

Sitio web informativo y catálogo visual para BLACK Lubricentro.

## Estructura

- `index.html`: estructura semántica de la página, navegación, servicios, catálogo demo, presentación y contacto.
- `css/styles.css`: estilos visuales, variables de color y diseño responsive mobile-first.
- `js/script.js`: comportamiento mínimo del menú hamburguesa en pantallas pequeñas.
- `assets/images/`: imágenes generales del sitio, como el fondo del hero.
- `assets/products/`: imágenes de productos del catálogo.
- `assets/logo/`: logo oficial de BLACK.

## Próximos reemplazos

1. Agregar el logo real en `assets/logo/` y actualizar el bloque de marca de `index.html`.
2. Agregar la imagen principal en `assets/images/hero-lubricentro.jpg`.
3. Reemplazar los productos de demostración por productos reales y sus imágenes.
4. Cambiar los enlaces de WhatsApp e Instagram por los datos oficiales.
5. Completar dirección y horarios únicamente cuando sean proporcionados.

## Backend implementado

El frontend continúa siendo HTML, CSS y JavaScript sin framework. La persistencia, autenticación y operaciones administrativas se ejecutan en las Functions y Supabase descritas abajo.

- `netlify/functions/products.mjs`: catálogo público de productos activos.
- `netlify/functions/orders.mjs`: crea pedidos con precios y stock validados por PostgreSQL.
- `netlify/functions/admin-auth.mjs`: login con Supabase Auth y autorización mediante `admin_users`.
- `netlify/functions/admin-products.mjs`: CRUD administrativo de productos.
- `netlify/functions/admin-orders.mjs`: consulta y actualización administrativa de pedidos.
- `netlify/functions/_shared/supabase.mjs`: clientes Supabase, CORS, autenticación y respuestas comunes.
- `supabase/schema.sql`: tablas, índices, RLS y funciones transaccionales para pedidos/cancelaciones.
- `supabase/seed.sql`: categorías y los 21 productos demo actuales.
- `supabase/admin-user.sql`: plantilla para autorizar el primer administrador.
- `netlify.toml`, `.env.example`, `.gitignore`, `package.json`: configuración local y de despliegue.

### Configuración rápida

1. Creá un proyecto en Supabase.
2. En Supabase SQL Editor ejecutá `supabase/schema.sql` y luego `supabase/seed.sql`.
3. En Authentication > Users creá el usuario administrador con email y contraseña.
4. Copiá su UUID y email en `supabase/admin-user.sql`, y ejecutalo en SQL Editor.
5. En Netlify configurá `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` como variables de entorno. La service role key solo debe existir en Netlify Functions.
6. En local copiá `.env.example` a `.env` y completá esos valores. No subas `.env` al repositorio.
7. Instalá dependencias con `npm install` y ejecutá `npx netlify dev`.

El catálogo, checkout y panel ya apuntan a `/api/*`. Las imágenes se administran por URL; no se agregó Supabase Storage porque el modelo actual puede funcionar sin carga de archivos. Los productos y pedidos reales requieren un proyecto Supabase configurado: en este entorno no se pudo probar una operación contra una base externa.
