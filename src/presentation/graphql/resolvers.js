import { MAX_PAGE_SIZE } from '../../application/pagination.js';
import { ValidationError } from '../../domain/errors.js';

/**
 * Resolvers are thin: they translate GraphQL arguments into use case calls
 * and use the per-request DataLoaders (context.loaders) for relations.
 */
export const resolvers = {
  Query: {
    users: (_, { limit, offset }, { useCases }) => useCases.users.getAllUsers({ limit, offset }),
    user: (_, { id }, { loaders }) => loaders.userById.load(id),
    products: (_, { limit, offset }, { useCases }) => useCases.products.getAllProducts({ limit, offset }),
    product: (_, { id }, { loaders }) => loaders.productById.load(id),
    orders: (_, { limit, offset }, { useCases }) => useCases.orders.getAllOrders({ limit, offset }),
    order: (_, { id }, { useCases }) => useCases.orders.getOrderById(id),
  },
  Mutation: {
    createUser: (_, args, { useCases }) => useCases.users.createUser(args),
    createProduct: (_, args, { useCases }) => useCases.products.createProduct(args),
    createOrder: (_, args, { useCases }) => useCases.orders.createOrder(args),
  },
  User: {
    orders: async (user, { limit }, { loaders }) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
        throw new ValidationError(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
      }
      return (await loaders.ordersByUserId.load(user.id)).slice(0, limit);
    },
  },
  Order: {
    user: (order, _, { loaders }) => loaders.userById.load(order.userId),
    products: async (order, _, { loaders }) => {
      const products = await loaders.productById.loadMany(order.productIds);
      const failure = products.find((product) => product instanceof Error);
      if (failure) throw failure;
      // Products are never deleted, but stay defensive for non-null typing.
      return products.filter(Boolean);
    },
  },
};
