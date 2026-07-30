import { randomUUID } from 'crypto';
import { queryAll, queryOne, runSql, runTransaction } from '../db-helper.js';

export class OrderRepository {
  constructor(db) {
    this.db = db;
  }

  async save(order) {
    const id = order.id || randomUUID();
    runTransaction(this.db, () => {
      runSql(this.db, 'INSERT INTO orders (id, userId, totalAmount) VALUES (?, ?, ?)', [id, order.userId, order.totalAmount]);
      for (const productId of order.productIds) {
        runSql(this.db, 'INSERT INTO order_products (orderId, productId) VALUES (?, ?)', [id, productId]);
      }
    });
    return { ...order, id };
  }

  async findAll() {
    const orders = queryAll(this.db, 'SELECT * FROM orders');
    for (const order of orders) {
      const products = queryAll(this.db, 'SELECT productId FROM order_products WHERE orderId = ?', [order.id]);
      order.productIds = products.map((p) => p.productId);
    }
    return orders;
  }

  async findById(id) {
    const order = queryOne(this.db, 'SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return null;
    const products = queryAll(this.db, 'SELECT productId FROM order_products WHERE orderId = ?', [id]);
    order.productIds = products.map((p) => p.productId);
    return order;
  }
}
