import { createApiKeyVerifier, extractApiKey } from '../../src/presentation/http/auth.js';
import { createLoadShedder, isGraphqlMutation } from '../../src/presentation/http/rateLimiter.js';

const fakeReq = (headers) => ({ get: (name) => headers[name.toLowerCase()] });

describe('API key auth', () => {
  const verify = createApiKeyVerifier({ enabled: true, apiKeys: ['first-key-0123456789', 'second-key-0123456789'] });

  it('extracts keys from Authorization or X-API-Key', () => {
    expect(extractApiKey(fakeReq({ authorization: 'Bearer abc' }))).toBe('abc');
    expect(extractApiKey(fakeReq({ 'x-api-key': 'def' }))).toBe('def');
    expect(extractApiKey(fakeReq({ authorization: 'Basic abc' }))).toBeNull();
  });

  it('accepts any configured key and rejects others', () => {
    expect(verify(fakeReq({ authorization: 'Bearer second-key-0123456789' }))).toBe(true);
    expect(verify(fakeReq({ 'x-api-key': 'first-key-0123456789' }))).toBe(true);
    expect(verify(fakeReq({ 'x-api-key': 'first-key-012345678' }))).toBe(false);
    expect(verify(fakeReq({}))).toBe(false);
  });

  it('allows everything when auth is disabled', () => {
    expect(createApiKeyVerifier({ enabled: false, apiKeys: [] })(fakeReq({}))).toBe(true);
  });
});

describe('isGraphqlMutation', () => {
  it('detects mutations, including in multi-operation documents', () => {
    expect(isGraphqlMutation({ query: 'mutation { createUser(name: "a", email: "b") { id } }' })).toBe(true);
    expect(isGraphqlMutation({ query: 'query A { users { id } } mutation B { x }' })).toBe(true);
    expect(isGraphqlMutation({ query: '# mutation\n{ users { id } }' })).toBe(false);
    expect(isGraphqlMutation({ query: 'not graphql' })).toBe(false);
    expect(isGraphqlMutation(undefined)).toBe(false);
  });
});

describe('load shedder', () => {
  const run = (middleware) => {
    const res = { headers: {}, setHeader: (k, v) => (res.headers[k] = v), status: (code) => ((res.code = code), res) };
    res.json = (body) => ((res.body = body), res);
    let nextCalled = false;
    middleware({ id: 'r1' }, res, () => (nextCalled = true));
    return { res, nextCalled };
  };

  it('rejects with 503 when the per-CPU load is above the threshold', () => {
    const { res, nextCalled } = run(createLoadShedder({ loadShedThreshold: 0.5 }, () => 1e6));
    expect(nextCalled).toBe(false);
    expect(res.code).toBe(503);
    expect(res.headers['Retry-After']).toBe('30');
  });

  it('passes through when disabled or under the threshold', () => {
    expect(run(createLoadShedder({ loadShedThreshold: 0 }, () => 1e6)).nextCalled).toBe(true);
    expect(run(createLoadShedder({ loadShedThreshold: 1 }, () => 0)).nextCalled).toBe(true);
  });
});
