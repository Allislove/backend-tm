import { Router } from 'express';

import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../shared/http/async-handler';
import {
  handleAddComment,
  handleAssignTicket,
  handleCloseTicket,
  handleCreateTicket,
  handleGetTicket,
  handleListTickets,
  handleReopenTicket,
  handleUpdateTicket
} from './tickets.controller';

export const ticketsRoutes = Router();

ticketsRoutes.use(authenticate);
ticketsRoutes.get('/', asyncHandler(handleListTickets));
ticketsRoutes.post('/', asyncHandler(handleCreateTicket));
ticketsRoutes.get('/:id', asyncHandler(handleGetTicket));
ticketsRoutes.patch('/:id', asyncHandler(handleUpdateTicket));
ticketsRoutes.post('/:id/assign', asyncHandler(handleAssignTicket));
ticketsRoutes.post('/:id/close', asyncHandler(handleCloseTicket));
ticketsRoutes.post('/:id/reopen', asyncHandler(handleReopenTicket));
ticketsRoutes.post('/:id/comments', asyncHandler(handleAddComment));
