import request from 'supertest';
import { AUTH, buildTestApp } from '../helpers.js';

describe('REST API', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestApp();
  });

  afterEach(() => ctx.close());

  const post = (path, body, headers = AUTH) => request(ctx.app).post(path).set(headers).send(body);

  describe('operational endpoints', () => {
    it('serves liveness, readiness and metrics without authentication', async () => {
      await request(ctx.app).get('/health').expect(200, /OK/);
      await request(ctx.app).get('/ready').expect(200, { status: 'Ready' });
      const metrics = await request(ctx.app).get('/metrics').expect(200);
      expect(metrics.text).toContain('http_request_duration_seconds');
    });

    it('reports not ready when the database is unavailable', async () => {
      ctx.container.database.ping = () => {
        throw new Error('closed');
      };
      await request(ctx.app).get('/ready').expect(503);
    });

    it('serves a script-free landing page with security headers', async () => {
      const res = await request(ctx.app).get('/').expect(200).expect('content-type', /html/);
      expect(res.text).not.toContain('<script');
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('serves the OpenAPI document', async () => {
      const res = await request(ctx.app).get('/swagger.json').expect(200);
      expect(res.body.paths['/api/users']).toBeDefined();
    });
  });

  describe('request id', () => {
    it('propagates a well-formed incoming X-Request-Id', async () => {
      const res = await request(ctx.app).get('/health').set('X-Request-Id', 'abc-123').expect(200);
      expect(res.headers['x-request-id']).toBe('abc-123');
    });

    it('replaces malformed ids and includes the id in error bodies', async () => {
      const res = await request(ctx.app).get('/api/users').set('X-Request-Id', 'bad id <script>').expect(401);
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.body.requestId).toBe(res.headers['x-request-id']);
    });
  });

  describe('authentication', () => {
    it('rejects requests without a valid API key', async () => {
      const res = await request(ctx.app).get('/api/users').expect(401);
      expect(res.body).toMatchObject({ status: 'error', code: 'UNAUTHENTICATED' });
      await request(ctx.app).get('/api/users').set('Authorization', 'Bearer wrong-key-0123456789').expect(401);
    });

    it('accepts the X-API-Key header', async () => {
      await request(ctx.app).get('/api/users').set('X-API-Key', AUTH.Authorization.slice(7)).expect(200);
    });
  });

  describe('users, products and orders', () => {
    it('creates and fetches resources', async () => {
      const user = await post('/api/users', { name: 'Ana', email: 'Ana@Example.com' }).expect(201);
      expect(user.body).toEqual({ id: expect.any(String), name: 'Ana', email: 'ana@example.com' });

      const p1 = await post('/api/products', { name: 'Pen', price: 0.1 }).expect(201);
      const p2 = await post('/api/products', { name: 'Ink', price: 0.2 }).expect(201);

      const order = await post('/api/orders', {
        userId: user.body.id,
        productIds: [p1.body.id, p2.body.id, p1.body.id],
      }).expect(201);
      expect(order.body.totalAmount).toBe(0.4);

      const fetched = await request(ctx.app).get(`/api/orders/${order.body.id}`).set(AUTH).expect(200);
      expect(fetched.body.productIds).toEqual([p1.body.id, p2.body.id, p1.body.id]);

      const list = await request(ctx.app).get('/api/orders').set(AUTH).expect(200);
      expect(list.body).toHaveLength(1);
      await request(ctx.app).get(`/api/users/${user.body.id}`).set(AUTH).expect(200);
    });

    it('returns consistent 404s', async () => {
      for (const path of ['/api/users/nope', '/api/products/nope', '/api/orders/nope', '/api/unknown']) {
        const res = await request(ctx.app).get(path).set(AUTH).expect(404);
        expect(res.body).toMatchObject({ status: 'error', code: 'NOT_FOUND' });
      }
    });

    it('validates input', async () => {
      const res = await post('/api/users', { name: 'Ana', email: 'not-an-email', admin: true }).expect(400);
      expect(res.body.code).toBe('BAD_USER_INPUT');
      expect(res.body.details.join(' ')).toMatch(/email/);
      expect(res.body.details.join(' ')).toMatch(/admin/);
      await post('/api/products', { name: 'Pen', price: '10' }).expect(400);
      await post('/api/products', { name: 'Pen', price: 1.234 }).expect(400);
      await post('/api/orders', { userId: 'u', productIds: [] }).expect(400);
    });

    it('rejects orders for unknown users or products', async () => {
      await post('/api/orders', { userId: 'ghost', productIds: ['p'] }).expect(404, /User not found/);
      const user = await post('/api/users', { name: 'Ana', email: 'ana@example.com' });
      await post('/api/orders', { userId: user.body.id, productIds: ['ghost'] }).expect(404, /Product ghost/);
    });

    it('returns 409 for duplicated emails', async () => {
      await post('/api/users', { name: 'Ana', email: 'ana@example.com' }).expect(201);
      const res = await post('/api/users', { name: 'Ana 2', email: 'ANA@example.com' }).expect(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('paginates lists', async () => {
      for (let i = 0; i < 3; i += 1) await post('/api/products', { name: `P${i}`, price: i });
      const page = await request(ctx.app).get('/api/products?limit=2&offset=1').set(AUTH).expect(200);
      expect(page.body.map((p) => p.name)).toEqual(['P1', 'P2']);
      await request(ctx.app).get('/api/products?limit=1000').set(AUTH).expect(400);
    });

    it('rejects malformed and oversized bodies without leaking details', async () => {
      const bad = await request(ctx.app)
        .post('/api/users')
        .set(AUTH)
        .set('content-type', 'application/json')
        .send('{"name":')
        .expect(400);
      expect(bad.body).toMatchObject({ code: 'BAD_REQUEST', message: 'Malformed request body' });
      expect(JSON.stringify(bad.body)).not.toMatch(/at JSON|stack/);
      await post('/api/users', { name: 'x'.repeat(200_000), email: 'a@b.co' }).expect(413);
    });

    it('masks unexpected errors as 500 without stack traces', async () => {
      ctx.container.useCases.users.getAllUsers = async () => {
        throw new Error('secret internal detail');
      };
      const res = await request(ctx.app).get('/api/users').set(AUTH).expect(500);
      expect(res.body).toEqual({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
        requestId: expect.any(String),
      });
    });
  });
});

describe('REST rate limiting', () => {
  it('limits writes more strictly than reads and never limits probes', async () => {
    const ctx = await buildTestApp({ RATE_LIMIT_MAX: '50', RATE_LIMIT_WRITE_MAX: '2' });
    try {
      const create = () => request(ctx.app).post('/api/products').set(AUTH).send({ name: 'P', price: 1 });
      await create().expect(201);
      await create().expect(201);
      const limited = await create().expect(429);
      expect(limited.body.code).toBe('RATE_LIMITED');
      await request(ctx.app).get('/api/products').set(AUTH).expect(200);
      for (let i = 0; i < 60; i += 1) await request(ctx.app).get('/health').expect(200);
    } finally {
      await ctx.close();
    }
  });
});
