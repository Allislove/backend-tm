import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import { handleLogin, handleMe } from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/login', asyncHandler(handleLogin));
authRoutes.get('/me', authenticate, asyncHandler(handleMe));
