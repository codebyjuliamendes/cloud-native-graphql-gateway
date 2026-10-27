import { randomUUID } from 'node:crypto';
import { placeholders, queryAll, queryOne, runSql, runTransaction } from '../db-helper.js';

export class OrderRepository {
  /** @param {{ db: import('sql.js').Database, persist: () => void }} database */
  constructor(database) {
    this.database = database;
  }

  get db() {
    return this.database.db;
  }

  async save(order) {
    const id = order.id || randomUUID();
    runTransaction(this.db, () => {
      runSql(this.db, 'INSERT INTO orders (id, userId, totalAmount) VALUES (?, ?, ?)', [
        id,
        order.userId,
        order.totalAmount,
      ]);
      for (const productId of order.productIds) {
        runSql(this.db, 'INSERT INTO order_products (orderId, productId) VALUES (?, ?)', [id, productId]);
      }
    });
    this.database.persist();
    return { id, userId: order.userId, productIds: [...order.productIds], totalAmount: order.totalAmount };
  }

  async findAll({ limit, offset }) {
    const orders = queryAll(this.db, 'SELECT id, userId, totalAmount FROM orders ORDER BY rowid LIMIT ? OFFSET ?', [
      limit,
      offset,
    ]);
    return this.#attachProducts(orders);
  }

  async findById(id) {
    const order = queryOne(this.db, 'SELECT id, userId, totalAmount FROM orders WHERE id = ?', [id]);
    if (!order) return null;
    return this.#attachProducts([order])[0];
  }

  /** Orders for many users at once (used by the GraphQL DataLoader). */
  async findByUserIds(userIds) {
    if (userIds.length === 0) return [];
    const orders = queryAll(
      this.db,
      `SELECT id, userId, totalAmount FROM orders WHERE userId IN (${placeholders(userIds.length)}) ORDER BY rowid`,
      userIds,
    );
    return this.#attachProducts(orders);
  }

  /** Loads product ids for all orders with a single query (no N+1). */
  #attachProducts(orders) {
    if (orders.length === 0) return orders;
    const rows = queryAll(
      this.db,
      `SELECT orderId, productId FROM order_products WHERE orderId IN (${placeholders(orders.length)}) ORDER BY rowid`,
      orders.map((order) => order.id),
    );
    const byOrder = new Map(orders.map((order) => [order.id, []]));
    for (const row of rows) byOrder.get(row.orderId).push(row.productId);
    return orders.map((order) => ({ ...order, productIds: byOrder.get(order.id) }));
  }
}
