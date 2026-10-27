import { OrderUseCases } from '../../src/application/useCases/orderUseCases.js';
import { NotFoundError, ServiceUnavailableError, ValidationError } from '../../src/domain/errors.js';

function setup({ user = { id: 'u1' }, products = [] } = {}) {
  const saved = [];
  const orders = { save: async (order) => (saved.push(order), { ...order, id: 'o1' }) };
  const productRepo = { findByIds: async (ids) => products.filter((p) => ids.includes(p.id)) };
  const users = { findById: async () => user };
  return { useCases: new OrderUseCases(orders, productRepo, users), saved };
}

describe('OrderUseCases.createOrder', () => {
  const products = [
    { id: 'p1', price: 0.1 },
    { id: 'p2', price: 0.2 },
  ];

  it('computes an exact total, counting repeated products as units', async () => {
    const { useCases } = setup({ products });
    const order = await useCases.createOrder({ userId: 'u1', productIds: ['p1', 'p2', 'p1'] });
    expect(order).toMatchObject({ id: 'o1', totalAmount: 0.4, productIds: ['p1', 'p2', 'p1'] });
  });

  it('rejects unknown users and products', async () => {
    await expect(setup({ user: null }).useCases.createOrder({ userId: 'x', productIds: ['p1'] })).rejects.toThrow(
      NotFoundError,
    );
    await expect(setup({ products }).useCases.createOrder({ userId: 'u1', productIds: ['p9'] })).rejects.toThrow(
      'Product p9 not found',
    );
  });

  it('validates input before touching repositories', async () => {
    await expect(setup().useCases.createOrder({ userId: 'u1', productIds: [] })).rejects.toThrow(ValidationError);
  });

  it('refuses to write based on stale (degraded) data', async () => {
    const { useCases, saved } = setup({ user: { id: 'u1', isStale: true }, products });
    await expect(useCases.createOrder({ userId: 'u1', productIds: ['p1'] })).rejects.toThrow(ServiceUnavailableError);
    const stale = setup({ products: [{ id: 'p1', price: 1, isStale: true }] });
    await expect(stale.useCases.createOrder({ userId: 'u1', productIds: ['p1'] })).rejects.toThrow(
      ServiceUnavailableError,
    );
    expect(saved).toHaveLength(0);
  });
});
