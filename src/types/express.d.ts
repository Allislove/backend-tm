import type { UserRole } from './domain';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
