import { query } from '../../database/pool';
import type { TicketPriority } from '../../types/domain';

export interface DashboardMetrics {
  openTickets: number;
  criticalPriority: number;
  avgResolutionHours: number | null;
  staleOver48h: number;
  ticketsByStatus: { status: string; count: number }[];
  topCriticalClients: { clientId: string; clientName: string; tickets: number }[];
  recentActivity: {
    id: string;
    ticketId: string;
    ticketNumber: string;
    summary: string;
    eventType: string;
    actorName: string | null;
    priority: TicketPriority;
    createdAt: Date;
  }[];
  openByAgent: { userId: string; displayName: string; tickets: number }[];
  ticketsByCategory: { categoryId: string | null; categoryName: string; tickets: number }[];
}

/* Este método calcula las métricas del dashboard operativo. */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [open, critical, avg, stale, byStatus, topClients, activity, byAgent, byCategory] = await Promise.all([
    query<{ count: string }>(
      `select count(*)::text as count
       from tickets
       where status in ('open', 'in_progress', 'pending')`
    ),
    query<{ count: string }>(
      `select count(*)::text as count
       from tickets
       where priority = 'critical'
         and status <> 'closed'`
    ),
    query<{ hours: string | null }>(
      `select round(extract(epoch from avg(resolved_at - created_at)) / 3600, 1)::text as hours
       from tickets
       where resolved_at is not null`
    ),
    query<{ count: string }>(
      `select count(*)::text as count
       from tickets
       where updated_at < now() - interval '48 hours'
         and status <> 'closed'`
    ),
    query<{ status: string; count: string }>(
      `select status::text as status, count(*)::text as count
       from tickets
       group by status
       order by count desc`
    ),
    query<{ clientId: string; clientName: string; tickets: string }>(
      `select c.id as "clientId", c.name as "clientName", count(*)::text as tickets
       from tickets t
       join clients c on c.id = t.client_id
       where t.priority in ('high', 'critical')
         and t.status <> 'closed'
       group by c.id, c.name
       order by count(*) desc
       limit 5`
    ),
    query<{
      id: string;
      ticketId: string;
      ticketNumber: string;
      summary: string;
      eventType: string;
      actorName: string | null;
      priority: TicketPriority;
      createdAt: Date;
    }>(
      `select
         e.id,
         e.ticket_id as "ticketId",
         t.ticket_number as "ticketNumber",
         e.summary,
         e.event_type as "eventType",
         case
           when u.id is null then null
           else trim(u.first_name || ' ' || u.last_name)
         end as "actorName",
         t.priority::text as priority,
         e.created_at as "createdAt"
       from ticket_events e
       join tickets t on t.id = e.ticket_id
       left join users u on u.id = e.actor_id
       order by e.created_at desc
       limit 8`
    ),
    query<{ userId: string; displayName: string; tickets: string }>(
      `select
         u.id as "userId",
         trim(u.first_name || ' ' || u.last_name) as "displayName",
         count(*)::text as tickets
       from tickets t
       join users u on u.id = t.assigned_to
       where t.status in ('open', 'in_progress', 'pending')
       group by u.id, u.first_name, u.last_name
       order by count(*) desc`
    ),
    query<{ categoryId: string | null; categoryName: string; tickets: string }>(
      `select
         coalesce(c.id::text, '') as "categoryId",
         coalesce(c.name, t.category, 'Sin categoría') as "categoryName",
         count(*)::text as tickets
       from tickets t
       left join categories c on c.id = t.category_id
       where t.status in ('open', 'in_progress', 'pending')
       group by c.id, c.name, t.category
       order by count(*) desc
       limit 6`
    )
  ]);

  return {
    openTickets: Number(open.rows[0]?.count ?? 0),
    criticalPriority: Number(critical.rows[0]?.count ?? 0),
    avgResolutionHours: avg.rows[0]?.hours ? Number(avg.rows[0].hours) : null,
    staleOver48h: Number(stale.rows[0]?.count ?? 0),
    ticketsByStatus: byStatus.rows.map((row) => ({
      status: row.status,
      count: Number(row.count)
    })),
    topCriticalClients: topClients.rows.map((row) => ({
      clientId: row.clientId,
      clientName: row.clientName,
      tickets: Number(row.tickets)
    })),
    recentActivity: activity.rows,
    openByAgent: byAgent.rows.map((row) => ({
      userId: row.userId,
      displayName: row.displayName,
      tickets: Number(row.tickets)
    })),
    ticketsByCategory: byCategory.rows.map((row) => ({
      categoryId: row.categoryId || null,
      categoryName: row.categoryName,
      tickets: Number(row.tickets)
    }))
  };
}
