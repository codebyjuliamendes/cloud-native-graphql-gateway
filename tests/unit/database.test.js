import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../../src/infrastructure/database.js';
import { UserRepository } from '../../src/infrastructure/repositories/userRepository.js';

describe('createDatabase', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-db-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('persists writes to disk and reloads them on the next boot', async () => {
    const file = path.join(dir, 'nested', 'app.db');
    const first = await createDatabase({ file });
    const saved = await new UserRepository(first).save({ name: 'Ana', email: 'ana@example.com' });
    expect(fs.existsSync(file)).toBe(true);
    first.close();

    const second = await createDatabase({ file });
    await expect(new UserRepository(second).findById(saved.id)).resolves.toEqual(saved);
    expect(fs.readdirSync(path.dirname(file))).toEqual(['app.db']); // no temp files left behind
    second.close();
  });

  it('enforces foreign keys', async () => {
    const database = await createDatabase();
    expect(() => database.db.run("INSERT INTO orders (id, userId, totalAmount) VALUES ('o', 'ghost', 1)")).toThrow(
      /FOREIGN KEY/,
    );
    expect(database.ping()).toBe(true);
    database.close();
  });
});
