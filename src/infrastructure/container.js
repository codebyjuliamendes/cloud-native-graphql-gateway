import { OrderUseCases } from '../application/useCases/orderUseCases.js';
import { ProductUseCases } from '../application/useCases/productUseCases.js';
import { UserUseCases } from '../application/useCases/userUseCases.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { ProductRepository } from './repositories/productRepository.js';
import { UserRepository } from './repositories/userRepository.js';
import { withResilience } from './resilience.js';

/**
 * Composition root: wires repositories (wrapped with timeouts + circuit
 * breakers) into use cases. Built only after the database is open.
 *
 * @param {{
 *   database: Awaited<ReturnType<typeof import('./database.js').createDatabase>>,
 *   config: ReturnType<typeof import('../config/env.js').loadConfig>,
 *   logger?: import('pino').Logger,
 *   onBreakerStateChange?: (name: string, state: string) => void,
 * }} deps
 */
export function createContainer({ database, config, logger, onBreakerStateChange }) {
  const resilience = {
    timeoutMs: config.upstream.timeoutMs,
    errorThresholdPercentage: config.upstream.errorThresholdPercentage,
    resetTimeoutMs: config.upstream.resetTimeoutMs,
    volumeThreshold: config.upstream.volumeThreshold,
    staleCacheSize: config.upstream.staleCacheSize,
    logger,
    onStateChange: onBreakerStateChange,
  };

  const repositories = {
    users: withResilience(new UserRepository(database), { ...resilience, name: 'users' }),
    products: withResilience(new ProductRepository(database), { ...resilience, name: 'products' }),
    orders: withResilience(new OrderRepository(database), { ...resilience, name: 'orders' }),
  };

  const useCases = {
    users: new UserUseCases(repositories.users),
    products: new ProductUseCases(repositories.products),
    orders: new OrderUseCases(repositories.orders, repositories.products, repositories.users),
  };

  return {
    database,
    repositories,
    useCases,
    shutdown() {
      Object.values(repositories).forEach((repository) => repository.shutdown());
    },
  };
}
