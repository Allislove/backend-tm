import type { Request, Response } from 'express';

import { requireAuthUser } from '../../middleware/auth';
import { dashboardService } from './dashboard.service';

/* Este método responde con las métricas del dashboard operativo. */
export async function handleGetDashboard(request: Request, response: Response) {
  const authUser = requireAuthUser(request);
  const result = await dashboardService.getMetrics(authUser.role);
  response.json(result);
}
