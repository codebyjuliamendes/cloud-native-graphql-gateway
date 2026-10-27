import { createResourceRouter } from './resourceRouter.js';
import { createProductBody } from './schemas.js';

/** @param {import('../../application/useCases/productUseCases.js').ProductUseCases} products */
export const createProductRoutes = (products) =>
  createResourceRouter({
    label: 'Product',
    list: (page) => products.getAllProducts(page),
    get: (id) => products.getProductById(id),
    create: (body) => products.createProduct(body),
    createSchema: createProductBody,
  });
