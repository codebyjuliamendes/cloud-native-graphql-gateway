import { ValidationError } from '../../src/domain/errors.js';
import { MAX_ORDER_ITEMS, Order } from '../../src/domain/Order.js';
import { Product } from '../../src/domain/Product.js';
import { User } from '../../src/domain/User.js';

describe('Domain entities', () => {
  describe('User', () => {
    it('creates a valid user and normalizes the email', () => {
      const user = new User({ id: '1', name: '  John Doe ', email: ' John@Example.com ' });
      expect(user).toEqual({ id: '1', name: 'John Doe', email: 'john@example.com' });
    });

    it('requires name and email', () => {
      expect(() => new User({ id: '1', name: 'John Doe' })).toThrow('User name and email are required');
      expect(() => new User({ name: '   ', email: 'a@b.co' })).toThrow(ValidationError);
    });

    it('rejects invalid emails and long names', () => {
      expect(() => new User({ name: 'A', email: 'not-an-email' })).toThrow('valid email');
      expect(() => new User({ name: 'x'.repeat(121), email: 'a@b.co' })).toThrow('at most 120');
    });
  });

  describe('Product', () => {
    it('creates a valid product', () => {
      expect(new Product({ id: '1', name: 'Laptop', price: 1000.5 }).price).toBe(1000.5);
      expect(new Product({ name: 'Free', price: 0 }).price).toBe(0);
    });

    it('rejects negative, non-numeric and over-precise prices', () => {
      expect(() => new Product({ name: 'Laptop', price: -10 })).toThrow('Price must be greater than or equal to 0');
      expect(() => new Product({ name: 'Laptop', price: '10' })).toThrow('finite number');
      expect(() => new Product({ name: 'Laptop', price: Number.NaN })).toThrow('finite number');
      expect(() => new Product({ name: 'Laptop', price: 1.005 })).toThrow('two decimal places');
      expect(() => new Product({ name: 'Laptop' })).toThrow('required');
    });
  });

  describe('Order', () => {
    it('creates a valid order', () => {
      const order = new Order({ id: '1', userId: 'u1', productIds: ['p1'], totalAmount: 100 });
      expect(order.productIds).toHaveLength(1);
    });

    it('requires at least one product and caps the number of items', () => {
      expect(() => new Order({ userId: 'u1', productIds: [] })).toThrow(
        'Order must have a userId and at least one productId',
      );
      const tooMany = Array.from({ length: MAX_ORDER_ITEMS + 1 }, (_, i) => `p${i}`);
      expect(() => new Order({ userId: 'u1', productIds: tooMany })).toThrow('at most');
      expect(() => new Order({ userId: 'u1', productIds: [''] })).toThrow('non-empty string');
    });
  });
});
