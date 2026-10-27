import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createContainer } from '../src/infrastructure/container.js';
import { createDatabase } from '../src/infrastructure/database.js';

export const API_KEY = 'test-api-key-0123456789';
export const AUTH = { Authorization: `Bearer ${API_KEY}` };

export function testConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    API_KEYS: API_KEY,
    LOAD_SHED_THRESHOLD: '0',
    RATE_LIMIT_MAX: '0',
    RATE_LIMIT_WRITE_MAX: '0',
    ...overrides,
  });
}

/** Builds a full app on an in-memory database. */
export async function buildTestApp(overrides = {}) {
  const config = testConfig(overrides);
  const logger = pino({ level: 'silent' });
  const database = await createDatabase({ file: null });
  const container = createContainer({ database, config, logger });
  const { app, apollo, metrics } = await createApp({ config, logger, container });
  return {
    app,
    apollo,
    metrics,
    config,
    container,
    async close() {
      await apollo.stop();
      container.shutdown();
      database.close();
    },
  };
}

/** POSTs a GraphQL operation with the test API key. */
export function gql(request, app, query, variables, headers = AUTH) {
  return request(app).post('/graphql').set(headers).send({ query, variables });
}
