import path from 'node:path';
import Joi from 'joi';

const bool = Joi.boolean().truthy('1', 'yes', 'on').falsy('0', 'no', 'off');
const csv = (value) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  HOST: Joi.string().default('0.0.0.0'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent').default('info'),

  DB_FILE: Joi.string().allow(''),
  TRUST_PROXY: Joi.alternatives(Joi.number().integer().min(0), bool).default(false),
  CORS_ORIGINS: Joi.string().allow('').default('*'),
  BODY_LIMIT: Joi.string().default('100kb'),
  REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(30_000),
  SHUTDOWN_TIMEOUT_MS: Joi.number().integer().min(0).default(10_000),
  API_DOCS_ENABLED: bool.default(true),

  AUTH_ENABLED: bool,
  API_KEYS: Joi.string().allow('').default(''),

  GRAPHQL_INTROSPECTION: bool,
  GRAPHQL_LANDING_PAGE: bool,
  GRAPHQL_MAX_DEPTH: Joi.number().integer().min(1).default(7),
  GRAPHQL_MAX_COMPLEXITY: Joi.number().integer().min(1).default(1000),

  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .min(1000)
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().min(0).default(100),
  RATE_LIMIT_WRITE_MAX: Joi.number().integer().min(0).default(30),
  LOAD_SHED_THRESHOLD: Joi.number().min(0).default(1),

  UPSTREAM_TIMEOUT_MS: Joi.number().integer().min(1).default(3000),
  CIRCUIT_ERROR_THRESHOLD: Joi.number().min(1).max(100).default(50),
  CIRCUIT_RESET_MS: Joi.number().integer().min(100).default(10_000),
  CIRCUIT_VOLUME_THRESHOLD: Joi.number().integer().min(0).default(10),
  STALE_CACHE_SIZE: Joi.number().integer().min(0).default(500),
}).unknown(true);

export class ConfigError extends Error {}

/**
 * Validates environment variables once at boot and returns a frozen, typed
 * configuration object. Throws ConfigError with every problem found.
 * @param {NodeJS.ProcessEnv} [source]
 */
export function loadConfig(source = process.env) {
  const { value: env, error } = schema.validate(source, { abortEarly: false, convert: true });
  if (error) {
    throw new ConfigError(`Invalid configuration: ${error.details.map((d) => d.message).join('; ')}`);
  }

  const isProduction = env.NODE_ENV === 'production';
  const apiKeys = csv(env.API_KEYS);
  const authEnabled = env.AUTH_ENABLED ?? (isProduction || apiKeys.length > 0);
  if (authEnabled && apiKeys.length === 0) {
    throw new ConfigError(
      'Invalid configuration: API_KEYS is required when authentication is enabled ' +
        '(the default in production). Set AUTH_ENABLED=false to run without authentication.',
    );
  }
  if (apiKeys.some((key) => key.length < 16)) {
    throw new ConfigError('Invalid configuration: every API key must be at least 16 characters long');
  }

  let dbFile;
  if (env.DB_FILE === ':memory:' || (env.DB_FILE === undefined && env.NODE_ENV === 'test')) {
    dbFile = null;
  } else {
    dbFile = path.resolve(env.DB_FILE || 'cloud-native-api.db');
  }

  const introspection = env.GRAPHQL_INTROSPECTION ?? !isProduction;
  const corsOrigins = csv(env.CORS_ORIGINS);

  return Object.freeze({
    nodeEnv: env.NODE_ENV,
    isProduction,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    dbFile,
    trustProxy: env.TRUST_PROXY,
    corsOrigins: corsOrigins.includes('*') || corsOrigins.length === 0 ? '*' : corsOrigins,
    bodyLimit: env.BODY_LIMIT,
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    apiDocsEnabled: env.API_DOCS_ENABLED,
    auth: Object.freeze({ enabled: authEnabled, apiKeys: Object.freeze(apiKeys) }),
    graphql: Object.freeze({
      introspection,
      landingPage: env.GRAPHQL_LANDING_PAGE ?? introspection,
      maxDepth: env.GRAPHQL_MAX_DEPTH,
      maxComplexity: env.GRAPHQL_MAX_COMPLEXITY,
    }),
    rateLimit: Object.freeze({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      writeMax: env.RATE_LIMIT_WRITE_MAX,
      loadShedThreshold: env.LOAD_SHED_THRESHOLD,
    }),
    upstream: Object.freeze({
      timeoutMs: env.UPSTREAM_TIMEOUT_MS,
      errorThresholdPercentage: env.CIRCUIT_ERROR_THRESHOLD,
      resetTimeoutMs: env.CIRCUIT_RESET_MS,
      volumeThreshold: env.CIRCUIT_VOLUME_THRESHOLD,
      staleCacheSize: env.STALE_CACHE_SIZE,
    }),
  });
}
