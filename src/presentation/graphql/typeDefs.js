export const typeDefs = `#graphql
  """
  A customer. \`isStale\` is true when the value was served from the
  circuit-breaker cache because the data source is degraded.
  """
  type User {
    id: ID!
    name: String!
    email: String!
    "Orders placed by this user (most recent last)."
    orders(limit: Int = 20): [Order!]!
    isStale: Boolean
  }

  type Product {
    id: ID!
    name: String!
    price: Float!
    isStale: Boolean
  }

  type Order {
    id: ID!
    userId: ID!
    "Product ids in the order; a repeated id means multiple units."
    productIds: [ID!]!
    totalAmount: Float!
    user: User
    "Products in the order, in the same order (and multiplicity) as productIds."
    products: [Product!]!
    isStale: Boolean
  }

  type Query {
    "Paginated list (limit 1-100, default 50)."
    users(limit: Int = 50, offset: Int = 0): [User!]!
    user(id: ID!): User
    "Paginated list (limit 1-100, default 50)."
    products(limit: Int = 50, offset: Int = 0): [Product!]!
    product(id: ID!): Product
    "Paginated list (limit 1-100, default 50)."
    orders(limit: Int = 50, offset: Int = 0): [Order!]!
    order(id: ID!): Order
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createProduct(name: String!, price: Float!): Product!
    createOrder(userId: ID!, productIds: [ID!]!): Order!
  }
`;
