export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export function queryOne(db, sql, params = []) {
  return queryAll(db, sql, params)[0] ?? null;
}

export function runSql(db, sql, params = []) {
  db.run(sql, params);
  return { changes: db.getRowsModified() };
}

export function runTransaction(db, callback) {
  db.run('BEGIN TRANSACTION');
  try {
    const result = callback();
    db.run('COMMIT');
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

/** Builds `?, ?, ?` for an IN (...) clause. */
export function placeholders(count) {
  return Array.from({ length: count }, () => '?').join(', ');
}

export function isUniqueViolation(error) {
  return /UNIQUE constraint failed/i.test(error?.message ?? '');
}
