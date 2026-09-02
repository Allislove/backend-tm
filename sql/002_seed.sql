-- =============================================================================
-- Datos de demostración
-- Contraseña de todos los usuarios: Demo1234!
-- Hash bcrypt (cost 10). Regenerar con: npm run hash-password -- Demo1234!
-- Se puede volver a ejecutar: limpia el esquema tms y recarga el demo.
-- =============================================================================

set search_path to tms, public;

truncate table
  notifications,
  ticket_events,
  ticket_comments,
  ticket_assignments,
  tickets,
  clients,
  users,
  roles,
  categories
restart identity cascade;

insert into roles (id, code, name, description) values
  ('11111111-1111-1111-1111-111111111001', 'admin', 'Administrador', 'Consulta y actualiza cualquier ticket, asigna, gestiona usuarios y clientes, cierra o reabre, y ve KPIs de gestión como el tiempo de resolución.'),
  ('11111111-1111-1111-1111-111111111002', 'agent', 'Agente de soporte', 'Crea tickets, actualiza y comenta únicamente los asignados a él, cambia su estado. Ve un resumen básico de la cola.'),
  ('11111111-1111-1111-1111-111111111003', 'supervisor', 'Supervisor / Líder operativo', 'Consulta todos los tickets, reasigna, ve métricas básicas, revisa tickets sin actualizar > 48 h y agrega notas internas.');

insert into users (id, role_id, email, password_hash, first_name, last_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'admin@tickets.co', '$2b$10$uf7neM3rlF/7vzmKojMl0eTN0fFa64zh7Q8TiB0sW/Zhgoz5i9cMu', 'Andres', 'Romana'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'supervisor@tickets.co', '$2b$10$uf7neM3rlF/7vzmKojMl0eTN0fFa64zh7Q8TiB0sW/Zhgoz5i9cMu', 'Andrés', 'Rojas'),
  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111002', 'sarah@tickets.co', '$2b$10$uf7neM3rlF/7vzmKojMl0eTN0fFa64zh7Q8TiB0sW/Zhgoz5i9cMu', 'Sarah', 'Jenkins'),
  ('22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111002', 'david@tickets.co', '$2b$10$uf7neM3rlF/7vzmKojMl0eTN0fFa64zh7Q8TiB0sW/Zhgoz5i9cMu', 'David', 'Chen'),
  ('22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111002', 'mike@tickets.co', '$2b$10$uf7neM3rlF/7vzmKojMl0eTN0fFa64zh7Q8TiB0sW/Zhgoz5i9cMu', 'Mike', 'Torres');

insert into clients (id, name, contact_name, contact_email, contact_phone, notes) values
  ('33333333-3333-3333-3333-333333333001', 'Acme Corp Global', 'Patricia Gómez', 'patricia.gomez@acme.example', '+57 300 111 0001', 'Cliente estratégico. SLA 2 horas en críticos.'),
  ('33333333-3333-3333-3333-333333333002', 'Nexus Industries', 'Carlos Pérez', 'carlos.perez@nexus.example', '+57 300 111 0002', 'Planta de producción 24/7.'),
  ('33333333-3333-3333-3333-333333333003', 'Stark Logistics', 'Elena Vargas', 'elena.vargas@stark.example', '+57 300 111 0003', 'Integraciones API de despacho.'),
  ('33333333-3333-3333-3333-333333333004', 'Umbrella IT', 'Julián Castro', 'julian.castro@umbrella.example', '+57 300 111 0004', 'Outsourcing de infraestructura.'),
  ('33333333-3333-3333-3333-333333333005', 'Globex Inc', 'Ana Ruiz', 'ana.ruiz@globex.example', '+57 300 111 0005', 'Portal de facturación propio.'),
  ('33333333-3333-3333-3333-333333333006', 'Initech', 'Luis Romero', 'luis.romero@initech.example', '+57 300 111 0006', 'Equipo de marketing comparte accesos.');

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
  ('55555555-5555-5555-5555-555555555010', 'Reportes', 'Dashboards, exportaciones y jobs programados.');

-- Tickets: identificador único, cliente, título y requerimiento (motivo de creación).
insert into tickets (
  id, ticket_number, client_id, title, requirement, status, priority, category,
  assigned_to, created_by, resolved_at, closed_at, created_at, updated_at
) values
  (
    '44444444-4444-4444-4444-444444444001', 'TCK-8902', '33333333-3333-3333-3333-333333333001',
    'Caída del servidor en US-East',
    'Desde las 08:30 EST el cluster de reportes DB-PROD-REP-01 pierde conexiones de forma intermitente. Los dashboards financieros del Q3 no cargan. Necesitamos restablecer el servicio y un plan para evitar reincidencias.',
    'open', 'critical', 'Infraestructura',
    '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222001',
    null, null, now() - interval '50 minutes', now() - interval '10 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444002', 'TCK-8901', '33333333-3333-3333-3333-333333333005',
    'Timeout en el API de inicio de sesión',
    'El portal de facturación responde 504 al autenticar usuarios en hora pico. El requerimiento es identificar el cuello de botella y dejar un timeout razonable sin cortar sesiones válidas.',
    'in_progress', 'high', 'Autenticación',
    '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222005',
    null, null, now() - interval '3 hours', now() - interval '1 hour'
  ),
  (
    '44444444-4444-4444-4444-444444444003', 'TCK-8895', '33333333-3333-3333-3333-333333333006',
    'Actualizar permisos del equipo de marketing',
    'Marketing necesita acceso de lectura al tablero de campañas y no puede resetear contraseñas por el enlace de correo. Requerimos revisar roles y el flujo de recuperación.',
    'pending', 'medium', 'Cuentas',
    '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222003',
    null, null, now() - interval '6 hours', now() - interval '3 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444004', 'TCK-8890', '33333333-3333-3333-3333-333333333003',
    'Actualizar dirección de facturación',
    'Stark Logistics cambió de sede. El requerimiento es actualizar la dirección de facturación para la próxima factura y confirmar que el NIT no cambia.',
    'resolved', 'low', 'Facturación',
    '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222002',
    now() - interval '2 hours', null, now() - interval '1 day', now() - interval '2 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444005', 'TCK-8888', '33333333-3333-3333-3333-333333333002',
    'Solicitud de modo oscuro en el tablero',
    'El equipo de planta trabaja de noche y el tablero actual genera fatiga visual. Requerimiento: evaluar un interruptor de modo oscuro en el dashboard operativo.',
    'open', 'low', 'Producto',
    null, '22222222-2222-2222-2222-222222222005',
    null, null, now() - interval '2 days', now() - interval '2 days'
  ),
  (
    '44444444-4444-4444-4444-444444444006', 'TCK-8884', '33333333-3333-3333-3333-333333333001',
    'Límite de tasa de la API superado',
    'Acme reporta HTTP 429 en el conector de inventario. El requerimiento es revisar cuotas, identificar el cliente que dispara el pico y proponer un aumento temporal.',
    'open', 'high', 'API',
    '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222001',
    null, null, now() - interval '5 hours', now() - interval '5 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444007', 'TCK-8870', '33333333-3333-3333-3333-333333333002',
    'Latencia en consultas de producción',
    'Las consultas de picking tardan más de 12 segundos. Requerimiento: diagnóstico de índices y plan de ejecución en la base de producción.',
    'in_progress', 'critical', 'Base de datos',
    '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222002',
    null, null, now() - interval '4 days', now() - interval '3 days'
  ),
  (
    '44444444-4444-4444-4444-444444444008', 'TCK-8861', '33333333-3333-3333-3333-333333333004',
    'Certificado TLS por vencer',
    'El certificado de api.umbrella.example vence en 9 días. Requerimiento: renovar, desplegar y validar el handshake sin downtime.',
    'open', 'high', 'Seguridad',
    '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222001',
    null, null, now() - interval '3 days', now() - interval '60 hours'
  ),
  (
    '44444444-4444-4444-4444-444444444009', 'TCK-8850', '33333333-3333-3333-3333-333333333001',
    'Falla de réplica en reporting',
    'La réplica de reporting quedó rezagada 40 minutos. Requerimiento: sincronizar, documentar la causa y dejar alerta si el lag supera 5 minutos.',
    'closed', 'critical', 'Infraestructura',
    '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222001',
    now() - interval '20 days', now() - interval '19 days',
    now() - interval '22 days', now() - interval '19 days'
  ),
  (
    '44444444-4444-4444-4444-444444444010', 'TCK-8842', '33333333-3333-3333-3333-333333333003',
    'Error en webhook de despachos',
    'Los webhooks de entrega se duplican. Requerimiento: hacer el consumidor idempotente y reenviar los eventos fallidos de la última semana.',
    'resolved', 'medium', 'Integraciones',
    '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222002',
    now() - interval '12 days', null,
    date_trunc('month', now() - interval '1 month') + interval '5 days',
    date_trunc('month', now() - interval '1 month') + interval '8 days'
  ),
  (
    '44444444-4444-4444-4444-444444444011', 'TCK-8833', '33333333-3333-3333-3333-333333333005',
    'Exportación de facturas en CSV',
    'Contabilidad no puede exportar más de 5.000 filas. Requerimiento: permitir exportación paginada o asíncrona por correo.',
    'closed', 'low', 'Facturación',
    '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222003',
    now() - interval '6 days', now() - interval '5 days',
    now() - interval '10 days', now() - interval '5 days'
  ),
  (
    '44444444-4444-4444-4444-444444444012', 'TCK-8820', '33333333-3333-3333-3333-333333333001',
    'Acceso VPN para nuevo proveedor',
    'Un proveedor de nómina necesita VPN de solo lectura a un esquema. Requerimiento: crear usuario, restringir red y registrar la vigencia de 90 días.',
    'open', 'medium', 'Seguridad',
    '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222001',
    null, null, now() - interval '8 hours', now() - interval '8 hours'
  );

select setval('tms.ticket_number_seq', 8902, true);

update tickets t
set category_id = c.id
from categories c
where t.category_id is null
  and t.category is not null
  and lower(trim(t.category)) = lower(trim(c.name));

-- Historial de asignaciones (TCK-8870 reasignado más de dos veces).
insert into ticket_assignments (ticket_id, assigned_from, assigned_to, assigned_by, created_at) values
  ('44444444-4444-4444-4444-444444444001', null, '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222001', now() - interval '50 minutes'),
  ('44444444-4444-4444-4444-444444444002', null, '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222002', now() - interval '3 hours'),
  ('44444444-4444-4444-4444-444444444007', null, '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222002', now() - interval '4 days'),
  ('44444444-4444-4444-4444-444444444007', '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222002', now() - interval '3 days 12 hours'),
  ('44444444-4444-4444-4444-444444444007', '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222002', now() - interval '3 days'),
  ('44444444-4444-4444-4444-444444444010', null, '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222002', date_trunc('month', now() - interval '1 month') + interval '5 days'),
  ('44444444-4444-4444-4444-444444444010', '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222002', date_trunc('month', now() - interval '1 month') + interval '6 days'),
  ('44444444-4444-4444-4444-444444444010', '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222002', date_trunc('month', now() - interval '1 month') + interval '7 days'),
  ('44444444-4444-4444-4444-444444444010', '22222222-2222-2222-2222-222222222005', '22222222-2222-2222-2222-222222222003', '22222222-2222-2222-2222-222222222002', date_trunc('month', now() - interval '1 month') + interval '8 days');

insert into ticket_comments (ticket_id, author_id, body, is_internal, created_at) values
  (
    '44444444-4444-4444-4444-444444444001',
    '22222222-2222-2222-2222-222222222004',
    'Escalé esto al equipo de DBA. Están revisando límites de conexión y latencia entre app y el clúster.',
    false,
    now() - interval '25 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444001',
    '22222222-2222-2222-2222-222222222002',
    'Hay un pico de lecturas del widget nuevo. Aumenté temporalmente el pool; hace falta optimizar la consulta.',
    true,
    now() - interval '12 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444002',
    '22222222-2222-2222-2222-222222222004',
    'Reinicié el nodo de autenticación y dejé el monitor activo. Sigo viendo picos a las 09:00.',
    false,
    now() - interval '70 minutes'
  );

insert into notifications (user_id, actor_id, ticket_id, type, title, body, created_at) values
  (
    '22222222-2222-2222-2222-222222222003',
    '22222222-2222-2222-2222-222222222004',
    '44444444-4444-4444-4444-444444444001',
    'comment',
    'David Chen dejó un comentario en TCK-8902',
    'Escalé esto al equipo de DBA. Están revisando límites de conexión y latencia entre app y el clúster.',
    now() - interval '25 minutes'
  ),
  (
    '22222222-2222-2222-2222-222222222001',
    '22222222-2222-2222-2222-222222222004',
    '44444444-4444-4444-4444-444444444001',
    'comment',
    'David Chen dejó un comentario en TCK-8902',
    'Escalé esto al equipo de DBA. Están revisando límites de conexión y latencia entre app y el clúster.',
    now() - interval '25 minutes'
  ),
  (
    '22222222-2222-2222-2222-222222222003',
    '22222222-2222-2222-2222-222222222002',
    '44444444-4444-4444-4444-444444444001',
    'internal_note',
    'Andrés Rojas dejó una nota interna en TCK-8902',
    'Revisa la nota interna en el detalle del ticket.',
    now() - interval '12 minutes'
  ),
  (
    '22222222-2222-2222-2222-222222222005',
    '22222222-2222-2222-2222-222222222004',
    '44444444-4444-4444-4444-444444444002',
    'comment',
    'David Chen dejó un comentario en TCK-8901',
    'Reinicié el nodo de autenticación y dejé el monitor activo. Sigo viendo picos a las 09:00.',
    now() - interval '70 minutes'
  );

insert into ticket_events (ticket_id, actor_id, event_type, summary, created_at) values
  ('44444444-4444-4444-4444-444444444001', '22222222-2222-2222-2222-222222222001', 'created', 'Se creó el ticket TCK-8902', now() - interval '50 minutes'),
  ('44444444-4444-4444-4444-444444444001', '22222222-2222-2222-2222-222222222004', 'comment', 'Se agregó un comentario', now() - interval '25 minutes'),
  ('44444444-4444-4444-4444-444444444001', '22222222-2222-2222-2222-222222222002', 'internal_note', 'Se agregó una nota interna', now() - interval '12 minutes'),
  ('44444444-4444-4444-4444-444444444002', '22222222-2222-2222-2222-222222222005', 'created', 'Se creó el ticket TCK-8901', now() - interval '3 hours'),
  ('44444444-4444-4444-4444-444444444007', '22222222-2222-2222-2222-222222222002', 'assigned', 'El ticket fue reasignado a Sarah Jenkins', now() - interval '3 days'),
  ('44444444-4444-4444-4444-444444444004', '22222222-2222-2222-2222-222222222003', 'updated', 'El ticket quedó resuelto', now() - interval '2 hours'),
  ('44444444-4444-4444-4444-444444444011', '22222222-2222-2222-2222-222222222001', 'closed', 'El ticket fue cerrado', now() - interval '5 days');
