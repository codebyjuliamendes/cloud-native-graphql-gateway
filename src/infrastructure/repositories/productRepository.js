import { randomUUID } from 'crypto';
import { queryAll, queryOne, runSql } from '../db-helper.js';

export class ProductRepository {
  constructor(db) {
    this.db = db;
  }

  async save(product) {
    const id = product.id || randomUUID();
    runSql(this.db, 'INSERT INTO products (id, name, price) VALUES (?, ?, ?)', [id, product.name, product.price]);
    return { ...product, id };
  }

  async findAll() {
    return queryAll(this.db, 'SELECT * FROM products');
  }

  async findById(id) {
    return queryOne(this.db, 'SELECT * FROM products WHERE id = ?', [id]);
  }
}
