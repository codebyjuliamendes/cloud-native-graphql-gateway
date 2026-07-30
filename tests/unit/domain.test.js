import { User } from '../../src/domain/User.js';
import { Product } from '../../src/domain/Product.js';
import { Order } from '../../src/domain/Order.js';

describe('Domain Entities', () => {
  describe('User', () => {
    it('should create a valid user', () => {
      const user = new User({ id: '1', name: 'John Doe', email: 'john@example.com' });
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    it('should throw if missing name or email', () => {
      expect(() => new User({ id: '1', name: 'John Doe' })).toThrow('User name and email are required');
    });
  });

  describe('Product', () => {
    it('should create a valid product', () => {
      const product = new Product({ id: '1', name: 'Laptop', price: 1000 });
      expect(product.price).toBe(1000);
    });

    it('should throw if negative price', () => {
      expect(() => new Product({ id: '1', name: 'Laptop', price: -10 })).toThrow('Price must be greater than or equal to 0');
    });
  });

  describe('Order', () => {
    it('should create a valid order', () => {
      const order = new Order({ id: '1', userId: 'u1', productIds: ['p1'], totalAmount: 100 });
      expect(order.productIds).toHaveLength(1);
    });

    it('should throw if no products', () => {
      expect(() => new Order({ id: '1', userId: 'u1', productIds: [], totalAmount: 100 })).toThrow('Order must have a userId and at least one productId');
    });
  });
});
