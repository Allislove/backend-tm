export type UserRole = 'admin' | 'agent' | 'supervisor';

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export const OPEN_TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'pending'];

export const ALL_ROLES: UserRole[] = ['admin', 'agent', 'supervisor'];
