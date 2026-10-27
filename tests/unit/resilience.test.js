import { NotFoundError, ServiceUnavailableError } from '../../src/domain/errors.js';
import { LruCache, withResilience } from '../../src/infrastructure/resilience.js';

class FakeRepo {
  constructor() {
    this.fail = false;
    this.calls = 0;
  }
  async findById(id) {
    this.calls += 1;
    if (this.fail) throw new Error('db down');
    if (id === 'missing') throw new NotFoundError('nope');
    return { id, name: `item-${id}` };
  }
  async save(item) {
    if (this.fail) throw new Error('db down');
    return item;
  }
  async slow() {
    return new Promise((resolve) => setTimeout(resolve, 200));
  }
}

const options = {
  name: 'fake',
  timeoutMs: 50,
  errorThresholdPercentage: 50,
  resetTimeoutMs: 60_000,
  volumeThreshold: 2,
  staleCacheSize: 10,
};

describe('withResilience', () => {
  let repo;
  let wrapped;
  const states = [];

  beforeEach(() => {
    repo = new FakeRepo();
    states.length = 0;
    wrapped = withResilience(repo, { ...options, onStateChange: (name, state) => states.push([name, state]) });
  });

  afterEach(() => wrapped.shutdown());

  it('passes results through when healthy', async () => {
    await expect(wrapped.findById('1')).resolves.toEqual({ id: '1', name: 'item-1' });
  });

  it('does not treat expected application errors as failures', async () => {
    for (let i = 0; i < 5; i += 1) {
      await expect(wrapped.findById('missing')).rejects.toBeInstanceOf(NotFoundError);
    }
    expect(wrapped.breakers.findById.opened).toBe(false);
  });

  it('serves stale data for the same arguments when the upstream fails', async () => {
    await wrapped.findById('1');
    repo.fail = true;
    await expect(wrapped.findById('1')).resolves.toEqual({ id: '1', name: 'item-1', isStale: true });
    await expect(wrapped.findById('2')).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('opens the circuit and fails fast without calling the upstream', async () => {
    repo.fail = true;
    await expect(wrapped.findById('a')).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(wrapped.findById('b')).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(wrapped.breakers.findById.opened).toBe(true);
    expect(states).toContainEqual(['fake.findById', 'open']);
    const calls = repo.calls;
    await expect(wrapped.findById('c')).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(repo.calls).toBe(calls);
  });

  it('never falls back to cached data for writes', async () => {
    await wrapped.save({ id: 'x' });
    repo.fail = true;
    await expect(wrapped.save({ id: 'x' })).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('times out slow upstream calls', async () => {
    await expect(wrapped.slow()).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});

describe('LruCache', () => {
  it('evicts the least recently used entry', () => {
    const cache = new LruCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.size).toBe(2);
  });

  it('stores nothing when the size is zero', () => {
    const cache = new LruCache(0);
    cache.set('a', 1);
    expect(cache.size).toBe(0);
  });
});
