import CircuitBreaker from 'opossum';
import { AppError, ServiceUnavailableError } from '../domain/errors.js';

/** Small LRU used to serve the last known good result while a circuit is open. */
export class LruCache {
  constructor(maxEntries) {
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.maxEntries <= 0) return;
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxEntries) this.map.delete(this.map.keys().next().value);
  }

  get size() {
    return this.map.size;
  }
}

const markStale = (value) => {
  if (Array.isArray(value)) return value.map((item) => ({ ...item, isStale: true }));
  if (value && typeof value === 'object') return { ...value, isStale: true };
  return value;
};

const isReadMethod = (name) => name.startsWith('find');

/**
 * Wraps every method of a data source ("upstream") in its own circuit breaker
 * with a timeout.
 *
 * - Expected errors (AppError: not found, conflict, validation) never count as
 *   failures and never trigger the fallback.
 * - Read methods (`find*`) fall back to the last successful result for the
 *   exact same arguments, marked with `isStale: true`.
 * - Write methods never fall back: they fail fast with a 503.
 *
 * @param {object} target repository instance
 * @param {{
 *   name: string,
 *   timeoutMs: number,
 *   errorThresholdPercentage: number,
 *   resetTimeoutMs: number,
 *   volumeThreshold: number,
 *   staleCacheSize: number,
 *   logger?: import('pino').Logger,
 *   onStateChange?: (name: string, state: 'open' | 'halfOpen' | 'closed') => void,
 * }} options
 */
export function withResilience(target, options) {
  const { name, logger, onStateChange, staleCacheSize, ...breakerOptions } = options;
  const wrapped = { breakers: {} };
  const proto = Object.getPrototypeOf(target);

  for (const method of Object.getOwnPropertyNames(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, method);
    if (method === 'constructor' || typeof descriptor?.value !== 'function') continue;

    const breakerName = `${name}.${method}`;
    const cache = new LruCache(isReadMethod(method) ? staleCacheSize : 0);
    const breaker = new CircuitBreaker((...args) => target[method](...args), {
      name: breakerName,
      timeout: breakerOptions.timeoutMs,
      errorThresholdPercentage: breakerOptions.errorThresholdPercentage,
      resetTimeout: breakerOptions.resetTimeoutMs,
      volumeThreshold: breakerOptions.volumeThreshold,
      errorFilter: (error) => error instanceof AppError,
    });

    breaker.fallback((...args) => {
      const error = args.at(-1);
      if (isReadMethod(method)) {
        const cached = cache.get(JSON.stringify(args.slice(0, -1)));
        if (cached !== undefined) {
          logger?.warn({ breaker: breakerName }, 'Serving stale data from circuit breaker fallback');
          return markStale(cached);
        }
      }
      throw new ServiceUnavailableError(`Upstream ${breakerName} is unavailable`, error);
    });

    for (const state of ['open', 'halfOpen', 'close']) {
      breaker.on(state, () => {
        const normalized = state === 'close' ? 'closed' : state;
        logger?.warn({ breaker: breakerName, state: normalized }, 'Circuit breaker state changed');
        onStateChange?.(breakerName, normalized);
      });
    }

    wrapped.breakers[method] = breaker;
    wrapped[method] = async (...args) => {
      const result = await breaker.fire(...args);
      if (isReadMethod(method) && result != null && !result?.isStale && !result?.[0]?.isStale) {
        cache.set(JSON.stringify(args), result);
      }
      return result;
    };
  }

  wrapped.shutdown = () => Object.values(wrapped.breakers).forEach((breaker) => breaker.shutdown());
  return wrapped;
}
