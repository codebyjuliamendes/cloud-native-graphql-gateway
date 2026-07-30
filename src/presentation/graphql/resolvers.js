import { userUseCases, productUseCases, orderUseCases } from '../../infrastructure/dependencies.js';

export const resolvers = {
  Query: {
    users: () => userUseCases.getAllUsers(),
    user: (_, { id }) => userUseCases.getUserById(id),
    products: () => productUseCases.getAllProducts(),
    product: (_, { id }) => productUseCases.getProductById(id),
    orders: () => orderUseCases.getAllOrders(),
    order: (_, { id }) => orderUseCases.getOrderById(id),
  },
  Mutation: {
    createUser: (_, args) => userUseCases.createUser(args),
    createProduct: (_, args) => productUseCases.createProduct(args),
    createOrder: (_, args) => orderUseCases.createOrder(args),
  },
};
