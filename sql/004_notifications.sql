-- =============================================================================
-- Notificaciones in-app (ejecutar UNA vez sobre una base que ya tenía 001)
--   psql -U postgres -d tickets_management -f sql/004_notifications.sql
-- Luego puedes volver a correr 002_seed.sql para recargar el demo.
-- =============================================================================

set search_path to tms, public;

create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  actor_id      uuid not null references users (id),
  ticket_id     uuid not null references tickets (id) on delete cascade,
  comment_id    uuid references ticket_comments (id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint notifications_type_valid check (type in ('comment', 'internal_note'))
);

create index if not exists idx_notifications_user_created on notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread on notifications (user_id) where read_at is null;
