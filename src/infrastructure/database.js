import initSqlJs from 'sql.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import path from 'path';
import fs from 'fs';
import { runSql } from './db-helper.js';

const dbPath = env.NODE_ENV === 'test' ? ':memory:' : path.join(process.cwd(), 'cloud-native-api.db');

export let db;

export const initDatabase = async () => {
  try {
    const SQL = await initSqlJs();
    if (dbPath === ':memory:' || !fs.existsSync(dbPath)) {
      db = new SQL.Database();
    } else {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS order_products (
        orderId TEXT NOT NULL,
        productId TEXT NOT NULL,
        FOREIGN KEY (orderId) REFERENCES orders(id),
        FOREIGN KEY (productId) REFERENCES products(id)
      );
    `);

    if (dbPath !== ':memory:') {
      const data = db.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    }

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error(error, 'Failed to initialize database');
    throw error;
  }
};
