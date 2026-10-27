import path from 'node:path';
import { ConfigError, loadConfig } from '../../src/config/env.js';

const KEY = 'a-very-long-api-key-123';

describe('loadConfig', () => {
  it('applies development defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.auth.enabled).toBe(false);
    expect(config.graphql.introspection).toBe(true);
    expect(config.graphql.landingPage).toBe(true);
    expect(config.dbFile).toBe(path.resolve('cloud-native-api.db'));
    expect(config.corsOrigins).toBe('*');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('uses an in-memory database in tests', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).dbFile).toBeNull();
    expect(loadConfig({ DB_FILE: ':memory:' }).dbFile).toBeNull();
  });

  it('is secure by default in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(ConfigError);
    const config = loadConfig({ NODE_ENV: 'production', API_KEYS: `${KEY}, other-key-0123456789` });
    expect(config.auth).toEqual({ enabled: true, apiKeys: [KEY, 'other-key-0123456789'] });
    expect(config.graphql.introspection).toBe(false);
    expect(config.graphql.landingPage).toBe(false);
  });

  it('allows explicit overrides', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      AUTH_ENABLED: 'false',
      GRAPHQL_INTROSPECTION: 'true',
      CORS_ORIGINS: 'https://a.example, https://b.example',
      TRUST_PROXY: '1',
    });
    expect(config.auth.enabled).toBe(false);
    expect(config.graphql.introspection).toBe(true);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.trustProxy).toBe(1);
  });

  it('enables auth when keys are present and rejects short keys', () => {
    expect(loadConfig({ API_KEYS: KEY }).auth.enabled).toBe(true);
    expect(() => loadConfig({ API_KEYS: 'short' })).toThrow('at least 16 characters');
  });

  it('reports every invalid variable', () => {
    expect(() => loadConfig({ PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(/PORT.*LOG_LEVEL/);
  });
});
