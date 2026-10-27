import { createResourceRouter } from './resourceRouter.js';
import { createOrderBody } from './schemas.js';

/** @param {import('../../application/useCases/orderUseCases.js').OrderUseCases} orders */
export const createOrderRoutes = (orders) =>
  createResourceRouter({
    label: 'Order',
    list: (page) => orders.getAllOrders(page),
    get: (id) => orders.getOrderById(id),
    create: (body) => orders.createOrder(body),
    createSchema: createOrderBody,
  });
