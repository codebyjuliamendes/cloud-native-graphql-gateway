import http from 'node:http';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createMetrics } from './config/metrics.js';
import { createContainer } from './infrastructure/container.js';
import { createDatabase } from './infrastructure/database.js';

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message); // eslint-disable-line no-console
      process.exit(1);
    }
    throw error;
  }

  const logger = createLogger(config);
  if (!config.auth.enabled) {
    logger.warn('Authentication is DISABLED: every API route is public. Set API_KEYS to enable it.');
  }

  const metrics = createMetrics();
  const database = await createDatabase({ file: config.dbFile, logger });
  const container = createContainer({
    database,
    config,
    logger,
    onBreakerStateChange: metrics.setBreakerState,
  });

  const server = http.createServer();
  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = Math.min(config.requestTimeoutMs, 60_000);
  server.keepAliveTimeout = 65_000; // above common load balancer idle timeouts

  let shuttingDown = false;
  const { app, apollo } = await createApp({
    config,
    logger,
    container,
    metrics,
    apolloPlugins: [ApolloServerPluginDrainHttpServer({ httpServer: server })],
    isShuttingDown: () => shuttingDown,
  });
  server.on('request', app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
      introspection: config.graphql.introspection,
      db: config.dbFile ?? ':memory:',
    },
    'Server listening',
  );

  const shutdown = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');
    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, config.shutdownTimeoutMs);
    forceExit.unref();
    try {
      // Stops accepting connections and drains in-flight requests.
      await apollo.stop();
      await new Promise((resolve) => (server.listening ? server.close(() => resolve()) : resolve()));
      container.shutdown();
      database.close();
      logger.info('Shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'Unhandled promise rejection'));
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });
}

main().catch((error) => {
  console.error('Failed to start server', error); // eslint-disable-line no-console
  process.exit(1);
});
