import CircuitBreaker from 'opossum';
import { db } from './database.js';
import { UserRepository } from './repositories/userRepository.js';
import { ProductRepository } from './repositories/productRepository.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { UserUseCases } from '../application/useCases/userUseCases.js';
import { ProductUseCases } from '../application/useCases/productUseCases.js';
import { OrderUseCases } from '../application/useCases/orderUseCases.js';

function createBreaker(repo, methodName) {
  const cache = new Map();
  const breaker = new CircuitBreaker(repo[methodName].bind(repo), {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
  });

  breaker.on('success', (result, args) => {
    const key = JSON.stringify(args || []);
    cache.set(key, result);
  });

  breaker.fallback((...args) => {
    // Note: The last argument to fallback might be the Error, so we just stringify what looks like args.
    // Actually fallback receives same args as the function + error. Opossum's fallback gets (...args) where the last is the error.
    const callArgs = args.slice(0, -1);
    const key = JSON.stringify(callArgs);
    const cachedResult = cache.get(key) || cache.get(JSON.stringify([]));

    if (cachedResult) {
      if (Array.isArray(cachedResult)) {
        return cachedResult.map(item => ({ ...item, isStale: true }));
      }
      return { ...cachedResult, isStale: true };
    }
    const err = args[args.length - 1];
    throw new Error(`Service ${methodName} is unavailable and no cache is present. Original error: ${err.message}`);
  });

  return (...args) => breaker.fire(...args);
}

function wrapRepository(repo) {
  const wrapped = {};
  for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(repo))) {
    if (key !== 'constructor' && typeof repo[key] === 'function') {
      wrapped[key] = createBreaker(repo, key);
    }
  }
  return wrapped;
}

const rawUserRepository = new UserRepository(db);
const rawProductRepository = new ProductRepository(db);
const rawOrderRepository = new OrderRepository(db);

export const userRepository = wrapRepository(rawUserRepository);
export const productRepository = wrapRepository(rawProductRepository);
export const orderRepository = wrapRepository(rawOrderRepository);

export const userUseCases = new UserUseCases(userRepository);
export const productUseCases = new ProductUseCases(productRepository);
export const orderUseCases = new OrderUseCases(orderRepository, productRepository, userRepository);
