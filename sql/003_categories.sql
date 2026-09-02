-- =============================================================================
-- Categorías administrables ( Innovación para que el administrador pueda agregar categorias, y ser mas agil al momento de crear un ticket para!!)
--   psql -U postgres -d tickets_management -f sql/003_categories.sql
-- Luego puedes volver a correr 002_seed.sql para recargar el demo.
-- =============================================================================

set search_path to tms, public;

create table if not exists categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_name_not_empty check (length(trim(name)) > 0)
);

create unique index if not exists idx_categories_name_ci on categories (lower(trim(name)));

alter table tickets add column if not exists category_id uuid references categories (id);

create index if not exists idx_tickets_category_id on tickets (category_id);

drop trigger if exists trg_categories_updated_at on categories;
create trigger trg_categories_updated_at
before update on categories
for each row execute procedure set_updated_at();

insert into categories (id, name, description) values
  ('55555555-5555-5555-5555-555555555001', 'Infraestructura', 'Servidores, red, DNS y ambientes de producción.'),
  ('55555555-5555-5555-5555-555555555002', 'Autenticación', 'Login, sesiones, VPN y recuperación de acceso.'),
  ('55555555-5555-5555-5555-555555555003', 'Cuentas', 'Permisos, roles y altas de usuarios de cliente.'),
  ('55555555-5555-5555-5555-555555555004', 'Facturación', 'Facturas, NIT, portal de cobros y exportaciones.'),
  ('55555555-5555-5555-5555-555555555005', 'Producto', 'Solicitudes de funcionalidad y mejoras de UX.'),
  ('55555555-5555-5555-5555-555555555006', 'API', 'Integraciones REST, cuotas y errores HTTP.'),
  ('55555555-5555-5555-5555-555555555007', 'Base de datos', 'Rendimiento, réplicas, índices y backups.'),
  ('55555555-5555-5555-5555-555555555008', 'Seguridad', 'Certificados, accesos y hallazgos de seguridad.'),
  ('55555555-5555-5555-5555-555555555009', 'Integraciones', 'Webhooks, conectores y sistemas externos.'),
  ('55555555-5555-5555-5555-555555555010', 'Reportes', 'Dashboards, exportaciones y jobs programados.')
on conflict (id) do nothing;

update tickets t
set category_id = c.id
from categories c
where t.category_id is null
  and t.category is not null
  and lower(trim(t.category)) = lower(trim(c.name));
