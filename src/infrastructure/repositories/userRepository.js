import { randomUUID } from 'node:crypto';
import { ConflictError } from '../../domain/errors.js';
import { isUniqueViolation, placeholders, queryAll, queryOne, runSql } from '../db-helper.js';

export class UserRepository {
  /** @param {{ db: import('sql.js').Database, persist: () => void }} database */
  constructor(database) {
    this.database = database;
  }

  get db() {
    return this.database.db;
  }

  async save(user) {
    const id = user.id || randomUUID();
    try {
      runSql(this.db, 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [id, user.name, user.email]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A user with this email already exists');
      throw error;
    }
    this.database.persist();
    return { id, name: user.name, email: user.email };
  }

  async findAll({ limit, offset }) {
    return queryAll(this.db, 'SELECT id, name, email FROM users ORDER BY rowid LIMIT ? OFFSET ?', [limit, offset]);
  }

  async findById(id) {
    return queryOne(this.db, 'SELECT id, name, email FROM users WHERE id = ?', [id]);
  }

  async findByIds(ids) {
    if (ids.length === 0) return [];
    return queryAll(this.db, `SELECT id, name, email FROM users WHERE id IN (${placeholders(ids.length)})`, ids);
  }
}
