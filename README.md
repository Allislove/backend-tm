# Tickets Management API

API REST para la gestión interna de tickets de soporte. Express + TypeScript + PostgreSQL + JWT.

## Qué cubre esta versión

- Autenticación JWT (stateless, lista para ir detrás de Nginx).
- Roles: **administrador**, **agente de soporte** y **supervisor**.
- Tickets con identificador único (`TCK-0001`), cliente, título, **requerimiento o detalle** y **categoría del catálogo**.
- Catálogo de categorías (crear, editar, desactivar) a cargo del administrador.
- Comentarios públicos, notas internas, asignación/reasignación, cierre y reapertura.
- Notificaciones in-app cuando hay una nota en un ticket asignado o creado por el usuario.
- Dashboard operativo recortado por rol y las 8 consultas del reto en `queries.sql`.

## Permisos

| Acción | Admin | Agente | Supervisor |
| --- | --- | --- | --- |
| Consultar tickets | Todos | Todos (solo actualiza los asignados) | Todos |
| Crear ticket | Sí | Sí | Sí |
| Actualizar ticket | Cualquiera | Solo asignados | No (sí reasigna) |
| Asignar / reasignar | Sí | No | Sí |
| Comentarios | Públicos e internos | Públicos en asignados | Internos |
| Cerrar / reabrir | Sí | No | No |
| Usuarios, clientes y categorías | Sí | Listar agentes y categorías | Consultar clientes |
| Notificaciones in-app | Sí | Las de sus tickets | Las de tickets que crea o reasigna |
| Métricas básicas (abiertos, críticos, por estado) | Sí | Sí | Sí |
| Tickets sin actualizar > 48 h y carga por agente | Sí | No | Sí |
| Resolución promedio (KPI) | Sí | No | No |

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Base de datos

```sql
CREATE DATABASE tickets_management;
```

```bash
psql -U postgres -d tickets_management -f sql/001_schema.sql
psql -U postgres -d tickets_management -f sql/002_seed.sql
```

Si la base ya existía de una versión anterior:

```bash
psql -U postgres -d tickets_management -f sql/003_categories.sql
psql -U postgres -d tickets_management -f sql/004_notifications.sql
psql -U postgres -d tickets_management -f sql/002_seed.sql
```

Usuarios demo (contraseña `Demo1234!`):

- `admin@tickets.co` — Administrador
- `supervisor@tickets.co` — Supervisor
- `sarah@tickets.co` — Agente
- `david@tickets.co` — Agente
- `mike@tickets.co` — Agente

## Arranque local

```bash
cp .env.example .env
npm install
npm run dev
```

API: `http://localhost:4000/api/v1`. Health: `http://localhost:4000/health`.

## Insomnia

Importa `insomnia/Tickets-management-api.json`.

1. Ejecuta **Login administrador**.
2. Copia `accessToken` a la variable `jwt_token`.
3. El resto de requests envían `Authorization: Bearer {{ _.jwt_token }}`.

## Consultas del reto

`queries.sql` (en esta carpeta) tiene las 8 consultas pedidas. Ejecutarlas con `search_path` en `tms`.

## Decisiones

- **JWT y no sesiones**: el API detrás de Nginx puede tener más de una instancia sin sticky sessions.
- **PostgreSQL** con `ticket_assignments` y `ticket_events` para trazabilidad y las consultas del reto.
- **Campo `requirement`**: requerimiento o detalle por el cual se crea el ticket; obligatorio.
- **Catálogo de categorías**: el administrador las mantiene; el alta no admite texto libre.
- Validación con Zod, errores `{ error: { code, message, details } }` y respuestas `{ item }` o `{ items, meta }`.
- Logs HTTP en una línea, sin JWT ni headers. En producción el JSON es compacto.

## Producción (Lightsail)

`NODE_ENV=production`, `PORT=4000`, `CORS_ORIGIN` = origen del front (Amplify), `JWT_SECRET` propio.

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Nginx hace reverse proxy a `http://127.0.0.1:4000`. Plantilla: `../deploy/nginx/tickets-api.conf`.

## Evolución

- Correo (Brevo) al asignar o comentar.
- Adjuntos en S3.
- SLA por cliente y cola por área.
- Refresh token con rotación.

## Herramientas utilizadas

Node.js, Express, TypeScript, PostgreSQL, `pg`, Zod, jsonwebtoken, bcryptjs, Helmet, CORS, Pino, PM2, Insomnia, Cursor.
