import os from 'node:os';
import rateLimit from 'express-rate-limit';
import { parse } from 'graphql';

const cpuCount = Math.max(1, os.availableParallelism?.() ?? os.cpus().length);

const rateLimitHandler = (req, res) => {
  res.status(429).json({
    status: 'error',
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later.',
    requestId: req.id,
  });
};

/** General limiter for every API call (REST and GraphQL). */
export function createRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => max === 0,
    handler: rateLimitHandler,
  });
}

/** True when a GraphQL request body contains a mutation operation. */
export function isGraphqlMutation(body) {
  if (!body || typeof body.query !== 'string') return false;
  try {
    return parse(body.query, { noLocation: true }).definitions.some(
      (definition) => definition.kind === 'OperationDefinition' && definition.operation === 'mutation',
    );
  } catch {
    return false; // invalid documents are rejected by Apollo with a 400
  }
}

/** Stricter limiter for writes: REST POST/PUT/PATCH/DELETE and GraphQL mutations. */
export function createWriteRateLimiter({ windowMs, writeMax }) {
  return rateLimit({
    windowMs,
    limit: writeMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => {
      if (writeMax === 0) return true;
      if (req.baseUrl === '/graphql') return !isGraphqlMutation(req.body);
      return ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    },
    handler: rateLimitHandler,
  });
}

/**
 * Load shedding: answers 503 while the 1-minute load average per CPU is above
 * the threshold. Disabled when the threshold is 0. Never mounted on probes.
 */
export function createLoadShedder({ loadShedThreshold }, loadavg = () => os.loadavg()[0]) {
  return (req, res, next) => {
    if (loadShedThreshold > 0 && loadavg() / cpuCount > loadShedThreshold) {
      res.setHeader('Retry-After', '30');
      return res.status(503).json({
        status: 'error',
        code: 'OVERLOADED',
        message: 'Service temporarily overloaded, please retry later.',
        requestId: req.id,
      });
    }
    return next();
  };
}
