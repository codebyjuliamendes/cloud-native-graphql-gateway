import { randomUUID } from 'node:crypto';
import { placeholders, queryAll, queryOne, runSql } from '../db-helper.js';

export class ProductRepository {
  /** @param {{ db: import('sql.js').Database, persist: () => void }} database */
  constructor(database) {
    this.database = database;
  }

  get db() {
    return this.database.db;
  }

  async save(product) {
    const id = product.id || randomUUID();
    runSql(this.db, 'INSERT INTO products (id, name, price) VALUES (?, ?, ?)', [id, product.name, product.price]);
    this.database.persist();
    return { id, name: product.name, price: product.price };
  }

  async findAll({ limit, offset }) {
    return queryAll(this.db, 'SELECT id, name, price FROM products ORDER BY rowid LIMIT ? OFFSET ?', [limit, offset]);
  }

  async findById(id) {
    return queryOne(this.db, 'SELECT id, name, price FROM products WHERE id = ?', [id]);
  }

  async findByIds(ids) {
    if (ids.length === 0) return [];
    return queryAll(this.db, `SELECT id, name, price FROM products WHERE id IN (${placeholders(ids.length)})`, ids);
  }
}
