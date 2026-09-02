set search_path to tms, public;

-- -----------------------------------------------------------------------------
-- 1. Cantidad de tickets por estado para cada cliente.
-- -----------------------------------------------------------------------------
select
  c.id as client_id,
  c.name as client_name,
  t.status,
  count(*) as ticket_count
from tickets t
join clients c on c.id = t.client_id
group by c.id, c.name, t.status
order by c.name, t.status;

-- -----------------------------------------------------------------------------
-- 2. Cinco clientes con mayor cantidad de tickets de prioridad alta o crítica.
-- -----------------------------------------------------------------------------
select
  c.id as client_id,
  c.name as client_name,
  count(*) as high_or_critical_tickets
from tickets t
join clients c on c.id = t.client_id
where t.priority in ('high', 'critical')
group by c.id, c.name
order by high_or_critical_tickets desc, c.name
limit 5;

-- -----------------------------------------------------------------------------
-- 3. Tickets con más de 48 horas sin actualización y que no están cerrados.
-- -----------------------------------------------------------------------------
select
  t.id,
  t.ticket_number,
  t.title,
  t.status,
  t.priority,
  c.name as client_name,
  t.updated_at,
  now() - t.updated_at as idle_interval
from tickets t
join clients c on c.id = t.client_id
where t.status <> 'closed'
  and t.updated_at < now() - interval '48 hours'
order by t.updated_at asc;

-- -----------------------------------------------------------------------------
-- 4. Usuario con mayor cantidad de tickets resueltos durante el último mes.
-- -----------------------------------------------------------------------------
select
  u.id as user_id,
  u.email,
  trim(u.first_name || ' ' || u.last_name) as display_name,
  count(*) as resolved_last_month
from tickets t
join users u on u.id = t.assigned_to
where t.resolved_at is not null
  and t.resolved_at >= date_trunc('month', now() - interval '1 month')
  and t.resolved_at < date_trunc('month', now())
group by u.id, u.email, u.first_name, u.last_name
order by resolved_last_month desc
limit 1;

-- -----------------------------------------------------------------------------
-- 5. Tiempo promedio de resolución de tickets por prioridad.
-- -----------------------------------------------------------------------------
select
  t.priority,
  count(*) as resolved_tickets,
  round(extract(epoch from avg(t.resolved_at - t.created_at)) / 3600, 2) as avg_hours
from tickets t
where t.resolved_at is not null
group by t.priority
order by
  case t.priority
    when 'critical' then 1
    when 'high' then 2
    when 'medium' then 3
    else 4
  end;

-- -----------------------------------------------------------------------------
-- 6. Cantidad de tickets abiertos por agente.
-- -----------------------------------------------------------------------------
select
  u.id as user_id,
  u.email,
  trim(u.first_name || ' ' || u.last_name) as display_name,
  count(*) as open_tickets
from tickets t
join users u on u.id = t.assigned_to
where t.status in ('open', 'in_progress', 'pending')
group by u.id, u.email, u.first_name, u.last_name
order by open_tickets desc, display_name;

-- -----------------------------------------------------------------------------
-- 7. Tickets que han sido reasignados más de dos veces.
-- -----------------------------------------------------------------------------
select
  t.id,
  t.ticket_number,
  t.title,
  c.name as client_name,
  count(ta.id) as assignment_count
from tickets t
join ticket_assignments ta on ta.ticket_id = t.id
join clients c on c.id = t.client_id
group by t.id, t.ticket_number, t.title, c.name
having count(ta.id) > 2
order by assignment_count desc, t.ticket_number;

-- -----------------------------------------------------------------------------
-- 8. Porcentaje de tickets cerrados frente al total creados en los últimos 30 días.
-- -----------------------------------------------------------------------------
select
  count(*) as created_last_30_days,
  count(*) filter (where status = 'closed') as closed_last_30_days,
  round(
    100.0 * count(*) filter (where status = 'closed') / nullif(count(*), 0),
    2
  ) as closed_percentage
from tickets
where created_at >= now() - interval '30 days';
