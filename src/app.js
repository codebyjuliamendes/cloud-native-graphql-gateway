import fs from 'node:fs';
import { expressMiddleware } from '@as-integrations/express5';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { GraphQLError } from 'graphql';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { createMetrics } from './config/metrics.js';
import { createApiKeyVerifier, requireApiKey } from './presentation/http/auth.js';
import { errorHandler, notFoundHandler } from './presentation/http/errorHandler.js';
import { createLoadShedder, createRateLimiter, createWriteRateLimiter } from './presentation/http/rateLimiter.js';
import { requestId } from './presentation/http/requestId.js';
import { createLoaders } from './presentation/graphql/loaders.js';
import { createApolloServer } from './presentation/graphql/server.js';
import { createHealthRoutes } from './presentation/rest/health.js';
import { createOrderRoutes } from './presentation/rest/orderRoutes.js';
import { createProductRoutes } from './presentation/rest/productRoutes.js';
import { createUserRoutes } from './presentation/rest/userRoutes.js';

const openApiDocument = JSON.parse(fs.readFileSync(new URL('./swagger.json', import.meta.url), 'utf8'));

/** CSP needed by the Apollo Sandbox landing page (only when it is enabled). */
const sandboxHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://embeddable-sandbox.cdn.apollographql.com'],
      manifestSrc: ["'self'", 'apollo-server-landing-page.cdn.apollographql.com'],
      frameSrc: ["'self'", 'https://sandbox.embed.apollographql.com'],
    },
  },
});

/**
 * Builds the Express application (no network listener), so it can be used by
 * the server entry point and by integration tests alike.
 *
 * @param {{
 *   config: ReturnType<typeof import('./config/env.js').loadConfig>,
 *   logger: import('pino').Logger,
 *   container: ReturnType<typeof import('./infrastructure/container.js').createContainer>,
 *   metrics?: ReturnType<typeof createMetrics>,
 *   apolloPlugins?: import('@apollo/server').ApolloServerPlugin[],
 *   isShuttingDown?: () => boolean,
 * }} deps
 */
export async function createApp({
  config,
  logger,
  container,
  metrics = createMetrics(),
  apolloPlugins = [],
  isShuttingDown = () => false,
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      autoLogging: { ignore: (req) => ['/health', '/ready', '/metrics'].includes(req.url) },
    }),
  );
  app.use(metrics.middleware);
  const defaultHelmet = helmet();
  app.use((req, res, next) =>
    (req.path === '/graphql' && config.graphql.landingPage ? sandboxHelmet : defaultHelmet)(req, res, next),
  );
  app.use(cors({ origin: config.corsOrigins, exposedHeaders: ['x-request-id', 'RateLimit', 'RateLimit-Policy'] }));
  app.use(compression());
  app.use(express.json({ limit: config.bodyLimit }));

  // Probes and metrics: never rate limited, load shed or authenticated.
  app.get('/metrics', metrics.endpoint);
  app.use(
    '/',
    createHealthRoutes({
      ping: () => container.database.ping(),
      isShuttingDown,
      links: { graphql: config.graphql.landingPage, apiDocs: config.apiDocsEnabled },
    }),
  );

  if (config.apiDocsEnabled) {
    app.get('/swagger.json', (req, res) => res.json(openApiDocument));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: 'API Documentation' }));
  }

  const verifyApiKey = createApiKeyVerifier(config.auth);
  const protect = [
    createLoadShedder(config.rateLimit),
    createRateLimiter(config.rateLimit),
    createWriteRateLimiter(config.rateLimit),
  ];

  // REST API
  const { useCases, repositories } = container;
  app.use('/api', ...protect, requireApiKey(verifyApiKey));
  app.use('/api/users', createUserRoutes(useCases.users));
  app.use('/api/products', createProductRoutes(useCases.products));
  app.use('/api/orders', createOrderRoutes(useCases.orders));

  // GraphQL API
  const apollo = createApolloServer({ config, metrics, plugins: apolloPlugins });
  await apollo.start();
  app.use(
    '/graphql',
    ...protect,
    expressMiddleware(apollo, {
      context: async ({ req }) => {
        if (!verifyApiKey(req)) {
          throw new GraphQLError('Missing or invalid API key', {
            extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
          });
        }
        return { requestId: req.id, logger: req.log, useCases, loaders: createLoaders(repositories) };
      },
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, apollo, metrics };
}
