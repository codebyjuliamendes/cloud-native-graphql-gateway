import { jest } from '@jest/globals';
import request from 'supertest';
import { API_KEY, AUTH, buildTestApp, gql } from '../helpers.js';

const CREATE_FIXTURES = `
  mutation Fixtures {
    ana: createUser(name: "Ana", email: "ana@example.com") { id }
    bia: createUser(name: "Bia", email: "bia@example.com") { id }
    pen: createProduct(name: "Pen", price: 0.1) { id }
    ink: createProduct(name: "Ink", price: 0.2) { id }
  }
`;

async function seed(ctx) {
  const { body } = await gql(request, ctx.app, CREATE_FIXTURES).expect(200);
  const { ana, bia, pen, ink } = body.data;
  const createOrder = `mutation($userId: ID!, $productIds: [ID!]!) {
    createOrder(userId: $userId, productIds: $productIds) { id totalAmount }
  }`;
  await gql(request, ctx.app, createOrder, { userId: ana.id, productIds: [pen.id, ink.id, pen.id] }).expect(200);
  await gql(request, ctx.app, createOrder, { userId: bia.id, productIds: [ink.id] }).expect(200);
  return { ana, bia, pen, ink };
}

describe('GraphQL API', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestApp();
  });

  afterEach(() => ctx.close());

  it('runs queries and mutations end to end', async () => {
    const { ana } = await seed(ctx);
    const { body } = await gql(
      request,
      ctx.app,
      `query($id: ID!) { user(id: $id) { name email orders { totalAmount products { name price } } } }`,
      { id: ana.id },
    ).expect(200);
    expect(body.errors).toBeUndefined();
    expect(body.data.user).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      orders: [
        {
          totalAmount: 0.4,
          products: [
            { name: 'Pen', price: 0.1 },
            { name: 'Ink', price: 0.2 },
            { name: 'Pen', price: 0.1 },
          ],
        },
      ],
    });
  });

  it('batches nested lookups with DataLoader (no N+1)', async () => {
    await seed(ctx);
    const users = jest.spyOn(ctx.container.repositories.users, 'findByIds');
    const products = jest.spyOn(ctx.container.repositories.products, 'findByIds');
    const { body } = await gql(request, ctx.app, '{ orders { user { name } products { name } } }').expect(200);
    expect(body.data.orders).toHaveLength(2);
    expect(users).toHaveBeenCalledTimes(1);
    expect(products).toHaveBeenCalledTimes(1);
    expect(new Set(products.mock.calls[0][0]).size).toBe(2);
  });

  it('returns typed, client-safe errors', async () => {
    const { body } = await gql(request, ctx.app, 'mutation { createUser(name: "A", email: "nope") { id } }').expect(
      200,
    );
    expect(body.errors[0]).toMatchObject({
      message: 'User email must be a valid email address',
      extensions: { code: 'BAD_USER_INPUT' },
    });

    const missing = await gql(
      request,
      ctx.app,
      'mutation { createOrder(userId: "ghost", productIds: ["p"]) { id } }',
    ).expect(200);
    expect(missing.body.errors[0].extensions.code).toBe('NOT_FOUND');

    await gql(request, ctx.app, 'mutation { createUser(name: "A", email: "a@b.co") { id } }');
    const dup = await gql(request, ctx.app, 'mutation { createUser(name: "B", email: "A@b.co") { id } }');
    expect(dup.body.errors[0].extensions.code).toBe('CONFLICT');

    const page = await gql(request, ctx.app, '{ users(limit: 101) { id } }');
    expect(page.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
  });

  it('masks unexpected resolver errors and never sends stack traces', async () => {
    ctx.container.useCases.users.getAllUsers = async () => {
      throw new Error('SQLITE_CORRUPT: /var/data/secret.db');
    };
    const { body } = await gql(request, ctx.app, '{ users { id } }').expect(200);
    expect(body.errors[0]).toEqual({
      message: 'Internal server error',
      locations: [{ line: 1, column: 3 }],
      path: ['users'],
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });

  it('rejects queries that are too deep', async () => {
    const { body } = await gql(
      request,
      ctx.app,
      '{ orders { user { orders { user { orders { user { orders { id } } } } } } } }',
    ).expect(400);
    expect(body.errors[0].message).toMatch(/Query depth 8 exceeds the maximum allowed depth of 7/);
  });

  it('rejects queries that are too expensive, including via aliases', async () => {
    const { body } = await gql(
      request,
      ctx.app,
      '{ users(limit: 100) { orders(limit: 100) { products { name } } } }',
    ).expect(400);
    expect(body.errors[0].extensions.code).toBe('QUERY_TOO_COMPLEX');

    const aliases = Array.from({ length: 20 }, (_, i) => `a${i}: products(limit: 100) { id name }`).join(' ');
    const aliased = await gql(request, ctx.app, `{ ${aliases} }`).expect(400);
    expect(aliased.body.errors[0].extensions.code).toBe('QUERY_TOO_COMPLEX');

    await gql(request, ctx.app, '{ users { id name email } }').expect(200);
  });

  it('requires an API key', async () => {
    const res = await gql(request, ctx.app, '{ users { id } }', undefined, {}).expect(401);
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    await gql(request, ctx.app, '{ users { id } }', undefined, { 'X-API-Key': API_KEY }).expect(200);
  });

  it('propagates the request id', async () => {
    const res = await gql(request, ctx.app, '{ users { id } }', undefined, { ...AUTH, 'X-Request-Id': 'trace-42' });
    expect(res.headers['x-request-id']).toBe('trace-42');
  });

  it('blocks CSRF-able requests', async () => {
    await request(ctx.app).get('/graphql?query=%7B__typename%7D').set(AUTH).expect(400);
  });

  it('allows introspection outside production', async () => {
    const { body } = await gql(request, ctx.app, '{ __schema { queryType { name } } }').expect(200);
    expect(body.data.__schema.queryType.name).toBe('Query');
  });
});

describe('GraphQL in production mode', () => {
  let ctx;

  beforeAll(async () => {
    ctx = await buildTestApp({ NODE_ENV: 'production', DB_FILE: ':memory:' });
  });

  afterAll(() => ctx.close());

  it('disables introspection', async () => {
    const { body } = await gql(request, ctx.app, '{ __schema { types { name } } }').expect(400);
    expect(body.errors[0].message).toMatch(/introspection is not allowed/i);
  });

  it('hides field suggestions', async () => {
    const { body } = await gql(request, ctx.app, '{ users { emial } }').expect(400);
    expect(body.errors[0].message).toBe('Cannot query field "emial" on type "User".');
  });

  it('disables the landing page', async () => {
    const res = await request(ctx.app).get('/graphql').set('accept', 'text/html');
    expect(res.text ?? '').not.toContain('embeddable-sandbox');
    const home = await request(ctx.app).get('/').expect(200);
    expect(home.text).not.toContain('href="/graphql"');
  });
});

describe('GraphQL rate limiting', () => {
  it('applies the write limit to mutations only', async () => {
    const ctx = await buildTestApp({ RATE_LIMIT_MAX: '50', RATE_LIMIT_WRITE_MAX: '1' });
    try {
      const mutation = 'mutation { createProduct(name: "P", price: 1) { id } }';
      await gql(request, ctx.app, mutation).expect(200);
      await gql(request, ctx.app, mutation).expect(429);
      await gql(request, ctx.app, '{ products { id } }').expect(200);
    } finally {
      await ctx.close();
    }
  });
});
