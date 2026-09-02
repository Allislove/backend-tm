import { createApp } from './app';
import { env } from './config/env';
import { pool, verifyDatabaseConnection } from './database/pool';

/* Este método arranca el servidor HTTP después de comprobar la conexión a PostgreSQL. */
async function bootstrap() {
  const database = await verifyDatabaseConnection();

  if (!database) {
    throw new Error('La verificación de base de datos no devolvió filas.');
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Tickets Management API escuchando en http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `Base de datos: db=${database.databaseName} schema=${database.currentSchema} user=${database.currentUser}`
    );
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown();
  });

  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void bootstrap().catch(async (error) => {
  console.error('No fue posible iniciar la API de tickets');
  console.error(error);
  await pool.end();
  process.exit(1);
});
