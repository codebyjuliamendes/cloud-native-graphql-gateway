export const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
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
    productIds: [ID!]!
    totalAmount: Float!
    isStale: Boolean
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    products: [Product!]!
    product(id: ID!): Product
    orders: [Order!]!
    order(id: ID!): Order
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createProduct(name: String!, price: Float!): Product!
    createOrder(userId: ID!, productIds: [ID!]!): Order!
  }
`;
