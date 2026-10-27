import { NotFoundError, ServiceUnavailableError } from '../../domain/errors.js';
import { sumAmounts } from '../../domain/money.js';
import { Order } from '../../domain/Order.js';
import { normalizePage } from '../pagination.js';

const isStale = (entity) => Boolean(entity?.isStale);

export class OrderUseCases {
  constructor(orderRepository, productRepository, userRepository) {
    this.orderRepository = orderRepository;
    this.productRepository = productRepository;
    this.userRepository = userRepository;
  }

  async createOrder({ userId, productIds }) {
    // Validate the shape first so we never hit the database with bad input.
    new Order({ userId, productIds, totalAmount: 0 });

    const user = await this.userRepository.findById(userId);
    if (isStale(user)) {
      // Cached (degraded-mode) data must never be used to authorize a write.
      throw new ServiceUnavailableError('User data is degraded; try again later');
    }
    if (!user) throw new NotFoundError('User not found');

    const uniqueIds = [...new Set(productIds)];
    const products = await this.productRepository.findByIds(uniqueIds);
    if (products.some(isStale)) {
      throw new ServiceUnavailableError('Product data is degraded; try again later');
    }
    const byId = new Map(products.map((product) => [product.id, product]));
    const missing = uniqueIds.find((productId) => !byId.has(productId));
    if (missing) throw new NotFoundError(`Product ${missing} not found`);

    // Duplicated product ids count as multiple units of the same product.
    const totalAmount = sumAmounts(productIds.map((productId) => byId.get(productId).price));
    return this.orderRepository.save(new Order({ userId, productIds, totalAmount }));
  }

  async getAllOrders(page) {
    return this.orderRepository.findAll(normalizePage(page));
  }

  async getOrderById(id) {
    return this.orderRepository.findById(id);
  }
}
