import { AppError } from '../../shared/http/app-error';
import type { UserRole } from '../../types/domain';
import { getDashboardMetrics, type DashboardMetrics } from './dashboard.repository';

export type DashboardScope = 'agent' | 'supervisor' | 'admin';

export interface ScopedDashboardMetrics {
  scope: DashboardScope;
  openTickets: number;
  criticalPriority: number;
  ticketsByStatus: DashboardMetrics['ticketsByStatus'];
  ticketsByCategory: DashboardMetrics['ticketsByCategory'];
  recentActivity: DashboardMetrics['recentActivity'];
  avgResolutionHours?: number | null;
  staleOver48h?: number;
  topCriticalClients?: DashboardMetrics['topCriticalClients'];
  openByAgent?: DashboardMetrics['openByAgent'];
}

/* Este método recorta las métricas según el rol: básico, operativo o de gestión. */
function scopeMetrics(role: UserRole, metrics: DashboardMetrics): ScopedDashboardMetrics {
  const basic: ScopedDashboardMetrics = {
    scope: 'agent',
    openTickets: metrics.openTickets,
    criticalPriority: metrics.criticalPriority,
    ticketsByStatus: metrics.ticketsByStatus,
    ticketsByCategory: metrics.ticketsByCategory,
    recentActivity: metrics.recentActivity
  };

  if (role === 'agent') {
    return basic;
  }

  const operations: ScopedDashboardMetrics = {
    ...basic,
    scope: 'supervisor',
    staleOver48h: metrics.staleOver48h,
    topCriticalClients: metrics.topCriticalClients,
    openByAgent: metrics.openByAgent
  };

  if (role === 'supervisor') {
    return operations;
  }

  return {
    ...operations,
    scope: 'admin',
    avgResolutionHours: metrics.avgResolutionHours
  };
}

export const dashboardService = {
  /* Este método entrega el dashboard recortado al alcance del rol autenticado. */
  async getMetrics(role: UserRole) {
    if (role !== 'admin' && role !== 'supervisor' && role !== 'agent') {
      throw new AppError(403, 'forbidden', 'No tienes permiso para ver el dashboard.');
    }

    const metrics = await getDashboardMetrics();
    return { item: scopeMetrics(role, metrics) };
  }
};
