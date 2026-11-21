# Underty Menu

Plataforma SaaS multiempresa de menús digitales para restaurantes (Grupo Underty).
React + Vite + TypeScript + Tailwind · Supabase (PostgreSQL, Auth, Storage, RLS, Edge Function) · Vercel.

## Qué incluye

- **Superadmin** (`/superadmin`): dashboard, crear/editar restaurantes, accesos (usuario y contraseña), suscripciones (renovar, suspender, reactivar, pagos), planes y límites editables.
- **Panel del restaurante** (`/panel/:id`): productos, categorías, promociones, apariencia con vista previa, código QR (PNG y cartel A4), estadísticas, datos del local y sucursales.
- **Menú público** (subdominio o `/m/:slug`): responsive, carrito y pedido por WhatsApp, aviso si el servicio está suspendido/vencido.
- **Seguridad**: RLS en todas las tablas, el público solo entra por funciones (`get_public_menu`, `track_visit`), límites de plan validados en la base de datos, la `service_role` solo vive en la Edge Function.

## Puesta en marcha (Windows / PowerShell)

### 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. En **SQL Editor**, ejecuta en orden los archivos de `supabase/migrations/`: `001` → `002` → `003` → `004` → `005`.
3. **Authentication > Users > Add user**: crea tu usuario (marca *Auto Confirm User*). Luego ejecuta `006_first_superadmin.sql` cambiando el correo.
4. **Authentication > URL Configuration**: agrega tu URL de la app (y `http://localhost:5173`) en *Site URL / Redirect URLs* (necesario para recuperar contraseña).
5. (Opcional) Ejecuta `supabase/tests/rls_isolation.sql` en el SQL Editor: imprime `OK` por cada prueba de permisos y revierte todo al final.

### 2. Edge Function (crear accesos de clientes)
```powershell
npm i -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy create-restaurant-user
```
No necesitas configurar secretos: Supabase ya inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Frontend
```powershell
copy .env.example .env      # y completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev                 # http://localhost:5173
```
Entra con tu usuario superadmin → **Restaurantes → Nuevo restaurante**.
En desarrollo el menú público se ve en `http://localhost:5173/m/<slug>`.

### 4. Despliegue en Vercel
1. Sube el proyecto a GitHub e impórtalo en Vercel.
2. Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE_DOMAIN=grupounderty.com`, `VITE_DEFAULT_COUNTRY_CODE=51`.
3. En *Domains* agrega `grupounderty.com` y el comodín `*.grupounderty.com` (en tu DNS: registro `CNAME *` apuntando a `cname.vercel-dns.com`; el comodín requiere nameservers de Vercel para el certificado SSL).
4. `app.grupounderty.com` (o el dominio raíz) sirve el login y los paneles; cada `slug.grupounderty.com` muestra el menú de ese restaurante. Los QR usan esa dirección.
   Sin `VITE_BASE_DOMAIN`, todo funciona con `/m/<slug>` (útil para probar en Vercel antes de comprar el comodín).

## Reglas de negocio importantes

- **Estados**: activo, pendiente, vencido, suspendido, cancelado. Un “activo” con fecha de vencimiento pasada se trata como **vencido** automáticamente (el dashboard también lo persiste).
- **Menú público visible** solo en *activo* y *pendiente* (pendiente = recién creado, en configuración). En vencido/suspendido/cancelado muestra “Servicio temporalmente no disponible”.
- **Panel del cliente**: en vencido/suspendido/cancelado queda en **solo lectura** (también bloqueado por RLS y Storage). Nada se elimina.
- **Planes**: `plans.limits` (JSON) define `max_products`, `max_branches` (-1 = ilimitado), `advanced_theme`, `promotions`, `stats`, `branch_stats`. Se editan en **Planes**. Los precios sembrados (S/ 29 / 59 / 99) son de ejemplo.
- El **superadmin** no está sujeto a los límites de plan.
- Solo el superadmin puede cambiar el `slug`; si cambia, hay que volver a descargar el QR.
- Visitas: se cuenta 1 por sesión del navegador; categorías y productos se cuentan al abrirlos.

## Estructura

```
supabase/migrations   esquema, RLS, funciones, storage, seed
supabase/functions    create-restaurant-user (Edge Function)
supabase/tests        pruebas de aislamiento de datos
src/lib               supabase, tenant (subdominios), wa, qr, storage, tema
src/components/ui     kit de componentes reutilizables
src/features          auth · superadmin · panel · restaurants · public-menu
```

## No incluido en v1 (según la especificación)
Pasarela de pagos, WhatsApp Business API y analítica avanzada. Para marcar vencidas automáticamente sin abrir el dashboard puedes programar `select refresh_subscription_status()` con pg_cron (la lógica ya trata las vencidas correctamente aunque no se ejecute).
