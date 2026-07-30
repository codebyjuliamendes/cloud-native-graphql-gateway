import { randomUUID } from 'crypto';
import { queryAll, queryOne, runSql } from '../db-helper.js';

export class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async save(user) {
    const id = user.id || randomUUID();
    runSql(this.db, 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [id, user.name, user.email]);
    return { ...user, id };
  }

  async findAll() {
    return queryAll(this.db, 'SELECT * FROM users');
  }

  async findById(id) {
    return queryOne(this.db, 'SELECT * FROM users WHERE id = ?', [id]);
  }
}
