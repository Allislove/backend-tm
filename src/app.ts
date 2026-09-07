import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler } from './shared/http/error-handler';
import { createHttpLogger } from './shared/http/http-logger';
import { notFoundHandler } from './shared/http/not-found-handler';

/* Este método construye la aplicación Express con seguridad, CORS, JSON y el router de la API. */
export function createApp() {
  const app = express();

  app.use(createHttpLogger());
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((value) => value.trim()),
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'tickets-management-api' });
  });

  app.use(env.API_PREFIX, apiRouter);
  app.use(notFoundHandler);
  /* Llamamos al handler para mapear los errores */
  app.use(errorHandler);

  return app;
}
