import type { PoolClient } from 'pg';

import { query, withTransaction } from '../../database/pool';
import { AppError } from '../../shared/http/app-error';
import type { TicketPriority, TicketStatus } from '../../types/domain';

export interface TicketListRow {
  id: string;
  ticketNumber: string;
  title: string;
  requirement: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  categoryId: string | null;
  clientId: string;
  clientName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  assignmentCount: number;
}

export interface TicketCommentRow {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface TicketEventRow {
  id: string;
  ticketId: string;
  actorId: string | null;
  actorName: string | null;
  eventType: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  clientId?: string;
  assignedTo?: string;
  categoryId?: string;
  stale?: boolean;
  page: number;
  limit: number;
}

const TICKET_SELECT = `
  t.id,
  t.ticket_number as "ticketNumber",
  t.title,
  t.requirement,
  t.status::text as status,
  t.priority::text as priority,
  coalesce(cat.name, t.category) as category,
  t.category_id as "categoryId",
  t.client_id as "clientId",
  c.name as "clientName",
  t.assigned_to as "assignedTo",
  case
    when au.id is null then null
    else trim(au.first_name || ' ' || au.last_name)
  end as "assignedToName",
  t.created_by as "createdBy",
  trim(cu.first_name || ' ' || cu.last_name) as "createdByName",
  t.created_at as "createdAt",
  t.updated_at as "updatedAt",
  t.resolved_at as "resolvedAt",
  t.closed_at as "closedAt",
  (
    select count(*)::int
    from ticket_assignments ta
    where ta.ticket_id = t.id
  ) as "assignmentCount"
`;

/* Este método construye el WHERE dinámico de listado de tickets según filtros. */
function buildTicketFilters(filters: TicketFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(
      `(t.ticket_number ilike $${params.length}
        or t.title ilike $${params.length}
        or t.requirement ilike $${params.length}
        or c.name ilike $${params.length})`
    );
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`t.priority = $${params.length}`);
  }

  if (filters.clientId) {
    params.push(filters.clientId);
    conditions.push(`t.client_id = $${params.length}`);
  }

  if (filters.categoryId) {
    params.push(filters.categoryId);
    conditions.push(`t.category_id = $${params.length}`);
  }

  if (filters.assignedTo === 'unassigned') {
    conditions.push('t.assigned_to is null');
  } else if (filters.assignedTo) {
    params.push(filters.assignedTo);
    conditions.push(`t.assigned_to = $${params.length}`);
  }

  if (filters.stale) {
    conditions.push(`t.updated_at < now() - interval '48 hours'`);
    conditions.push(`t.status not in ('closed')`);
  }

  return {
    where: conditions.length > 0 ? `where ${conditions.join(' and ')}` : '',
    params
  };
}

/* Este método lista tickets con filtros, búsqueda, tickets sin actualizar y paginación. */
export async function listTickets(filters: TicketFilters) {
  const { where, params } = buildTicketFilters(filters);
  const offset = (filters.page - 1) * filters.limit;

  const countResult = await query<{ total: string }>(
    `select count(*)::text as total
     from tickets t
     join clients c on c.id = t.client_id
     ${where}`,
    params
  );

  const listParams = [...params, filters.limit, offset];

  const result = await query<TicketListRow>(
    `select ${TICKET_SELECT}
     from tickets t
     join clients c on c.id = t.client_id
     left join categories cat on cat.id = t.category_id
     left join users au on au.id = t.assigned_to
     join users cu on cu.id = t.created_by
     ${where}
     order by
       case t.priority
         when 'critical' then 1
         when 'high' then 2
         when 'medium' then 3
         else 4
       end,
       t.updated_at desc
     limit $${listParams.length - 1} offset $${listParams.length}`,
    listParams
  );

  return {
    items: result.rows,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total: Number(countResult.rows[0]?.total ?? 0)
    }
  };
}

/* Este método obtiene un ticket por id o por número visible (TCK-0001). */
export async function findTicketByIdOrNumber(idOrNumber: string): Promise<TicketListRow | null> {
  const result = await query<TicketListRow>(
    `select ${TICKET_SELECT}
     from tickets t
     join clients c on c.id = t.client_id
     left join categories cat on cat.id = t.category_id
     left join users au on au.id = t.assigned_to
     join users cu on cu.id = t.created_by
     where t.id::text = $1 or t.ticket_number = $1
     limit 1`,
    [idOrNumber]
  );

  return result.rows[0] ?? null;
}

/* Este método inserta un evento de auditoría/actividad sobre un ticket. */
export async function insertTicketEvent(
  client: PoolClient,
  input: {
    ticketId: string;
    actorId: string | null;
    eventType: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into ticket_events (ticket_id, actor_id, event_type, summary, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [input.ticketId, input.actorId, input.eventType, input.summary, JSON.stringify(input.metadata ?? {})]
  );
}

/* Este método crea un ticket con identificador único, cliente, título y requerimiento. */
export async function createTicket(input: {
  clientId: string;
  title: string;
  requirement: string;
  priority: TicketPriority;
  categoryId?: string | null;
  category?: string | null;
  assignedTo?: string | null;
  createdBy: string;
}): Promise<TicketListRow> {
  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: string; ticketNumber: string }>(
      `insert into tickets (
         ticket_number, client_id, title, requirement, priority, category, category_id, assigned_to, created_by
       )
       values (tms.next_ticket_number(), $1, $2, $3, $4, $5, $6, $7, $8)
       returning id, ticket_number as "ticketNumber"`,
      [
        input.clientId,
        input.title,
        input.requirement,
        input.priority,
        input.category ?? null,
        input.categoryId ?? null,
        input.assignedTo ?? null,
        input.createdBy
      ]
    );

    const created = inserted.rows[0];

    if (!created) {
      throw new AppError(500, 'ticket_creation_failed', 'No fue posible crear el ticket.');
    }

    if (input.assignedTo) {
      await client.query(
        `insert into ticket_assignments (ticket_id, assigned_from, assigned_to, assigned_by)
         values ($1, null, $2, $3)`,
        [created.id, input.assignedTo, input.createdBy]
      );
    }

    await insertTicketEvent(client, {
      ticketId: created.id,
      actorId: input.createdBy,
      eventType: 'created',
      summary: `Se creó el ticket ${created.ticketNumber}`,
      metadata: { priority: input.priority }
    });

    return created.id;
  }).then(async (ticketId) => {
    const ticket = await findTicketByIdOrNumber(ticketId);

    if (!ticket) {
      throw new AppError(500, 'ticket_creation_failed', 'El ticket se creó pero no pudo consultarse.');
    }

    return ticket;
  });
}

/* Este método actualiza campos operativos de un ticket y registra el evento. */
export async function updateTicket(
  ticketId: string,
  actorId: string,
  input: {
    title?: string;
    requirement?: string;
    status?: Exclude<TicketStatus, 'closed'>;
    priority?: TicketPriority;
    categoryId?: string | null;
    category?: string | null;
  }
): Promise<TicketListRow> {
  const current = await findTicketByIdOrNumber(ticketId);

  if (!current) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  await withTransaction(async (client) => {
    const resolvedAtSql =
      input.status === 'resolved' && current.status !== 'resolved'
        ? 'now()'
        : input.status && input.status !== 'resolved'
          ? 'null'
          : 'resolved_at';

    await client.query(
      `update tickets
       set
         title = coalesce($2, title),
         requirement = coalesce($3, requirement),
         status = coalesce($4::ticket_status, status),
         priority = coalesce($5::ticket_priority, priority),
         category = case when $7::boolean then $6 else category end,
         category_id = case when $7::boolean then $8::uuid else category_id end,
         resolved_at = ${resolvedAtSql},
         closed_at = case when coalesce($4::ticket_status, status) <> 'closed' then null else closed_at end
       where id = $1`,
      [
        current.id,
        input.title ?? null,
        input.requirement ?? null,
        input.status ?? null,
        input.priority ?? null,
        input.category === undefined ? null : input.category,
        input.categoryId !== undefined,
        input.categoryId ?? null
      ]
    );

    await insertTicketEvent(client, {
      ticketId: current.id,
      actorId,
      eventType: 'updated',
      summary: 'Se actualizó el ticket',
      metadata: input as Record<string, unknown>
    });
  });

  const updated = await findTicketByIdOrNumber(current.id);

  if (!updated) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  return updated;
}

/* Este método asigna o reasigna un ticket y guarda el historial de asignaciones. */
export async function assignTicket(
  ticketId: string,
  assignedTo: string | null,
  assignedBy: string
): Promise<TicketListRow> {
  const current = await findTicketByIdOrNumber(ticketId);

  if (!current) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  await withTransaction(async (client) => {
    await client.query(`update tickets set assigned_to = $2 where id = $1`, [current.id, assignedTo]);
    await client.query(
      `insert into ticket_assignments (ticket_id, assigned_from, assigned_to, assigned_by)
       values ($1, $2, $3, $4)`,
      [current.id, current.assignedTo, assignedTo, assignedBy]
    );
    await insertTicketEvent(client, {
      ticketId: current.id,
      actorId: assignedBy,
      eventType: assignedTo ? 'assigned' : 'unassigned',
      summary: assignedTo ? 'El ticket fue asignado o reasignado' : 'Se quitó la asignación del ticket',
      metadata: { assignedFrom: current.assignedTo, assignedTo }
    });
  });

  const updated = await findTicketByIdOrNumber(current.id);

  if (!updated) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  return updated;
}

/* Este método cierra un ticket (solo administrador). */
export async function closeTicket(ticketId: string, actorId: string): Promise<TicketListRow> {
  const current = await findTicketByIdOrNumber(ticketId);

  if (!current) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  await withTransaction(async (client) => {
    await client.query(
      `update tickets
       set status = 'closed',
           closed_at = now(),
           resolved_at = coalesce(resolved_at, now())
       where id = $1`,
      [current.id]
    );
    await insertTicketEvent(client, {
      ticketId: current.id,
      actorId,
      eventType: 'closed',
      summary: 'El ticket fue cerrado'
    });
  });

  const updated = await findTicketByIdOrNumber(current.id);

  if (!updated) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  return updated;
}

/* Este método reabre un ticket cerrado y lo deja en estado abierto. */
export async function reopenTicket(ticketId: string, actorId: string): Promise<TicketListRow> {
  const current = await findTicketByIdOrNumber(ticketId);

  if (!current) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  await withTransaction(async (client) => {
    await client.query(
      `update tickets
       set status = 'open',
           closed_at = null
       where id = $1`,
      [current.id]
    );
    await insertTicketEvent(client, {
      ticketId: current.id,
      actorId,
      eventType: 'reopened',
      summary: 'El ticket fue reabierto'
    });
  });

  const updated = await findTicketByIdOrNumber(current.id);

  if (!updated) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  return updated;
}

/* Este método agrega un comentario público o interno al ticket. */
export async function addComment(input: {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
}): Promise<TicketCommentRow> {
  const ticket = await findTicketByIdOrNumber(input.ticketId);

  if (!ticket) {
    throw new AppError(404, 'ticket_not_found', 'El ticket no existe.');
  }

  const result = await withTransaction(async (client) => {
    const inserted = await client.query<TicketCommentRow>(
      `insert into ticket_comments (ticket_id, author_id, body, is_internal)
       values ($1, $2, $3, $4)
       returning
         id,
         ticket_id as "ticketId",
         author_id as "authorId",
         $5::text as "authorName",
         body,
         is_internal as "isInternal",
         created_at as "createdAt"`,
      [ticket.id, input.authorId, input.body, input.isInternal, '']
    );

    const comment = inserted.rows[0];

    if (!comment) {
      throw new AppError(500, 'comment_failed', 'No fue posible agregar el comentario.');
    }

    await insertTicketEvent(client, {
      ticketId: ticket.id,
      actorId: input.authorId,
      eventType: input.isInternal ? 'internal_note' : 'comment',
      summary: input.isInternal ? 'Se agregó una nota interna' : 'Se agregó un comentario'
    });

    return comment.id;
  });

  const comments = await listComments(ticket.id, true);
  const created = comments.find((item) => item.id === result);

  if (!created) {
    throw new AppError(500, 'comment_failed', 'El comentario se creó pero no pudo consultarse.');
  }

  return created;
}

/* Este método lista comentarios de un ticket; las notas internas se ocultan si includeInternal es false. */
export async function listComments(ticketId: string, includeInternal: boolean): Promise<TicketCommentRow[]> {
  const result = await query<TicketCommentRow>(
    `select
       c.id,
       c.ticket_id as "ticketId",
       c.author_id as "authorId",
       trim(u.first_name || ' ' || u.last_name) as "authorName",
       c.body,
       c.is_internal as "isInternal",
       c.created_at as "createdAt"
     from ticket_comments c
     join users u on u.id = c.author_id
     where c.ticket_id = $1
       and ($2::boolean = true or c.is_internal = false)
     order by c.created_at asc`,
    [ticketId, includeInternal]
  );

  return result.rows;
}

/* Este método lista la actividad reciente de un ticket. */
export async function listEvents(ticketId: string): Promise<TicketEventRow[]> {
  const result = await query<TicketEventRow>(
    `select
       e.id,
       e.ticket_id as "ticketId",
       e.actor_id as "actorId",
       case
         when u.id is null then null
         else trim(u.first_name || ' ' || u.last_name)
       end as "actorName",
       e.event_type as "eventType",
       e.summary,
       e.metadata,
       e.created_at as "createdAt"
     from ticket_events e
     left join users u on u.id = e.actor_id
     where e.ticket_id = $1
     order by e.created_at desc`,
    [ticketId]
  );

  return result.rows;
}
