import client from 'prom-client';

/**
 * Prometheus metrics on a dedicated registry (one per app instance, so tests
 * can build several apps without "metric already registered" errors).
 */
export function createMetrics() {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register, prefix: 'node_api_' });

  const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10],
    registers: [register],
  });

  const graphqlOperations = new client.Counter({
    name: 'graphql_operations_total',
    help: 'GraphQL operations by type and outcome',
    labelNames: ['operation', 'outcome'],
    registers: [register],
  });

  const breakerState = new client.Gauge({
    name: 'circuit_breaker_open',
    help: '1 when the circuit breaker is open or half-open, 0 when closed',
    labelNames: ['breaker'],
    registers: [register],
  });

  const middleware = (req, res, next) => {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      // Use the matched route template to keep label cardinality bounded.
      const route = req.route ? `${req.baseUrl}${req.route.path}` : req.baseUrl || 'unmatched';
      end({ method: req.method, route, status_code: res.statusCode });
    });
    next();
  };

  const endpoint = async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  };

  return {
    register,
    middleware,
    endpoint,
    recordOperation: (operation, outcome) => graphqlOperations.inc({ operation, outcome }),
    setBreakerState: (breaker, state) => breakerState.set({ breaker }, state === 'closed' ? 0 : 1),
  };
}
