import DataLoader from 'dataloader';

const MAX_BATCH = 500;

const indexBy = (rows, key) => new Map(rows.map((row) => [row[key], row]));

/**
 * Per-request DataLoaders: batch and de-duplicate lookups made by nested
 * resolvers (Order.user, Order.products, User.orders) to avoid N+1 queries.
 * A new set is created for every request, so caching never leaks between
 * requests or users.
 */
export function createLoaders(repositories) {
  return {
    userById: new DataLoader(
      async (ids) => {
        const byId = indexBy(await repositories.users.findByIds([...ids]), 'id');
        return ids.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: MAX_BATCH },
    ),
    productById: new DataLoader(
      async (ids) => {
        const byId = indexBy(await repositories.products.findByIds([...ids]), 'id');
        return ids.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: MAX_BATCH },
    ),
    ordersByUserId: new DataLoader(
      async (userIds) => {
        const grouped = new Map(userIds.map((id) => [id, []]));
        for (const order of await repositories.orders.findByUserIds([...userIds])) {
          grouped.get(order.userId)?.push(order);
        }
        return userIds.map((id) => grouped.get(id));
      },
      { maxBatchSize: MAX_BATCH },
    ),
  };
}
