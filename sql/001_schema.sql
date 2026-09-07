-- =============================================================================
-- Tickets Management — esquema PostgreSQL
-- Ejecutar como superusuario o dueño de la base:
--   CREATE DATABASE tickets_management;
--   \c tickets_management
--   \i 001_schema.sql
-- =============================================================================

create extension if not exists pgcrypto;

create schema if not exists tms;
set search_path to tms, public;

create type ticket_status as enum (
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed'
);

create type ticket_priority as enum (
  'critical',
  'high',
  'medium',
  'low'
);

create type user_role_code as enum (
  'admin',
  'agent',
  'supervisor'
);

create table roles (
  id            uuid primary key default gen_random_uuid(),
  code          user_role_code not null unique,
  name          text not null,
  description   text not null,
  created_at    timestamptz not null default now()
);

create table users (
  id              uuid primary key default gen_random_uuid(),
  role_id         uuid not null references roles (id),
  email           text not null unique,
  password_hash   text not null,
  first_name      text not null,
  last_name       text not null,
  is_active       boolean not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint users_email_format check (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

create table clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_name_not_empty check (length(trim(name)) > 0)
);

create unique index idx_categories_name_ci on categories (lower(trim(name)));

create sequence ticket_number_seq start with 8800 increment by 1;

create table tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_number   text not null unique,
  client_id       uuid not null references clients (id),
  title           text not null,
  requirement     text not null,
  status          ticket_status not null default 'open',
  priority        ticket_priority not null default 'medium',
  category        text,
  category_id     uuid references categories (id),
  assigned_to     uuid references users (id),
  created_by      uuid not null references users (id),
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tickets_title_not_empty check (length(trim(title)) > 0),
  constraint tickets_requirement_not_empty check (length(trim(requirement)) > 0)
);

create table ticket_comments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references tickets (id) on delete cascade,
  author_id     uuid not null references users (id),
  body          text not null,
  is_internal   boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint ticket_comments_body_not_empty check (length(trim(body)) > 0)
);

create table ticket_assignments (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references tickets (id) on delete cascade,
  assigned_from   uuid references users (id),
  assigned_to     uuid references users (id),
  assigned_by     uuid not null references users (id),
  created_at      timestamptz not null default now()
);

create table ticket_events (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references tickets (id) on delete cascade,
  actor_id      uuid references users (id),
  event_type    text not null,
  summary       text not null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table notifications (
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

create index idx_users_role_id on users (role_id);
create index idx_users_email on users (email);
create index idx_tickets_client_id on tickets (client_id);
create index idx_tickets_assigned_to on tickets (assigned_to);
create index idx_tickets_status on tickets (status);
create index idx_tickets_priority on tickets (priority);
create index idx_tickets_category_id on tickets (category_id);
create index idx_tickets_updated_at on tickets (updated_at);
create index idx_tickets_created_at on tickets (created_at);
create index idx_ticket_comments_ticket_id on ticket_comments (ticket_id, created_at);
create index idx_ticket_assignments_ticket_id on ticket_assignments (ticket_id);
create index idx_ticket_events_ticket_id on ticket_events (ticket_id, created_at desc);
create index idx_notifications_user_created on notifications (user_id, created_at desc);
create index idx_notifications_user_unread on notifications (user_id) where read_at is null;

/* Este método (función SQL) actualiza updated_at en cada modificación de fila. */
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
before update on users
for each row execute procedure set_updated_at();

create trigger trg_clients_updated_at
before update on clients
for each row execute procedure set_updated_at();

create trigger trg_tickets_updated_at
before update on tickets
for each row execute procedure set_updated_at();

create trigger trg_categories_updated_at
before update on categories
for each row execute procedure set_updated_at();

/* Este método genera el identificador visible del ticket (TCK-0001, TCK-0002, ...).
   Rellena a 4 dígitos solo si el número es más corto; nunca recorta, para que
   10000 sea TCK-10000 y no TCK-1000 (lpad truncaría y choca con UNIQUE). */
create or replace function next_ticket_number()
returns text
language plpgsql
as $$
declare
  next_value bigint;
  digits text;
begin
  next_value := nextval('tms.ticket_number_seq');
  digits := next_value::text;
  if length(digits) < 4 then
    digits := lpad(digits, 4, '0');
  end if;
  return 'TCK-' || digits;
end;
$$;

comment on column tickets.requirement is
  'Requerimiento o detalle: motivo por el cual el usuario crea el ticket.';

comment on table ticket_assignments is
  'Historial de asignaciones. Permite detectar tickets reasignados más de dos veces.';
