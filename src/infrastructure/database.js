import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const SCHEMA = `
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

  CREATE INDEX IF NOT EXISTS idx_orders_userid ON orders(userId);
  CREATE INDEX IF NOT EXISTS idx_order_products_orderid ON order_products(orderId);
  CREATE INDEX IF NOT EXISTS idx_order_products_productid ON order_products(productId);
`;

/**
 * Opens the embedded SQLite database (sql.js / WebAssembly).
 *
 * sql.js keeps the whole database in memory; when `file` is set, the database
 * is loaded from it on boot and written back atomically (temp file + rename)
 * after every successful write and on shutdown.
 *
 * @param {{ file?: string | null, logger?: import('pino').Logger }} options
 */
export async function createDatabase({ file = null, logger } = {}) {
  const SQL = await initSqlJs();
  const db = file && fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA);

  let closed = false;

  const persist = () => {
    if (!file || closed) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, Buffer.from(db.export()));
      fs.renameSync(tmp, file);
    } catch (error) {
      // The write is already committed in memory; it will be flushed again on
      // the next write or on shutdown. Surface it loudly instead of failing
      // the request (which would invite duplicate retries).
      logger?.error({ err: error, file }, 'Failed to persist database to disk');
    }
  };

  persist();

  return {
    db,
    persist,
    /** Lightweight readiness check. */
    ping() {
      db.exec('SELECT 1');
      return true;
    },
    close() {
      if (closed) return;
      persist();
      closed = true;
      db.close();
    },
  };
}
