import type { IncomingMessage, ServerResponse } from 'http';

import pinoHttp from 'pino-http';

import { env } from '../../config/env';

/* Este método obtiene la URL completa del request. */
function requestPath(request: IncomingMessage): string {
  const expressRequest = request as IncomingMessage & { originalUrl?: string };
  return expressRequest.originalUrl ?? request.url ?? '';
}

/* Este método crea el logger HTTP: una línea por request, sin JWT ni headers. */
export function createHttpLogger() {
  return pinoHttp({
    level: env.LOG_LEVEL,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      censor: '[redacted]'
    },
    ...(env.NODE_ENV === 'production'
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname,req,res,responseTime'
            }
          }
        }),
    autoLogging: {
      ignore: (request) => request.method === 'OPTIONS' || requestPath(request) === '/health'
    },
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) {
        return 'error';
      }

      if (response.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },
    customSuccessMessage: (request, response, responseTime) =>
      `${request.method} ${requestPath(request)} ${response.statusCode} ${Math.round(responseTime)}ms`,
    customErrorMessage: (request, response, error) =>
      `${request.method} ${requestPath(request)} ${response.statusCode} ${error.message}`,
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: requestPath(request)
        };
      },
      res(response: ServerResponse) {
        return {
          statusCode: response.statusCode
        };
      }
    }
  });
}
