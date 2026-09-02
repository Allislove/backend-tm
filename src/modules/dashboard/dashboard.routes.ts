import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import { handleGetDashboard } from './dashboard.controller';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);
dashboardRoutes.get('/metrics', asyncHandler(handleGetDashboard));
