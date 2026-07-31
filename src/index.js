import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { metricsMiddleware, metricsEndpoint } from './config/metrics.js';
import { rateLimiter } from './presentation/middlewares/rateLimiter.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';
import { initDatabase } from './infrastructure/database.js';

// REST Routes
import healthRoutes from './presentation/rest/health.js';
import userRoutes from './presentation/rest/userRoutes.js';
import productRoutes from './presentation/rest/productRoutes.js';
import orderRoutes from './presentation/rest/orderRoutes.js';

// GraphQL Schema & Resolvers
import { typeDefs } from './presentation/graphql/typeDefs.js';
import { resolvers } from './presentation/graphql/resolvers.js';

async function bootstrap() {
  const app = express();

  // Initialize DB
  await initDatabase();

  // Basic Middlewares
  try {
    app.use(helmet());
    app.use(cors());
    app.use(compression());
  } catch (err) {
    logger.error(err, 'Failed to initialize security/performance middlewares');
  }
  app.use(express.json());
  app.use(pinoHttp({ logger, autoLogging: false }));
  app.use(metricsMiddleware);
  app.use(rateLimiter);

  // Observability endpoints
  app.get('/metrics', metricsEndpoint);
  app.use('/', healthRoutes);

  // REST API
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);

  // Apollo caching query hash background updates plugin
  const queryHashCachePlugin = {
    async requestDidStart(requestContext) {
      return {
        async willSendResponse(requestContext) {
          if (requestContext.queryHash) {
            // Background update simulation for query hash
            setImmediate(() => {
              logger.info(`[Background Task] Updating cache for query hash: ${requestContext.queryHash}`);
              // Store/Update cached representation of query in Redis/Memory
            });
          }
        }
      };
    }
  };

  // GraphQL Setup
  const apolloServer = new ApolloServer({ 
    typeDefs, 
    resolvers,
    plugins: [queryHashCachePlugin]
  });
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));

  // Error Handler
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
    logger.info(`GraphQL endpoint: http://localhost:${env.PORT}/graphql`);
  });
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
