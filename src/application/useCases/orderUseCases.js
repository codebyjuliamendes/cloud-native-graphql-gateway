import { Order } from '../../domain/Order.js';

export class OrderUseCases {
  constructor(orderRepository, productRepository, userRepository) {
    this.orderRepository = orderRepository;
    this.productRepository = productRepository;
    this.userRepository = userRepository;
  }

  async createOrder(orderData) {
    const user = await this.userRepository.findById(orderData.userId);
    if (!user) throw new Error('User not found');

    let totalAmount = 0;
    for (const productId of orderData.productIds) {
      const product = await this.productRepository.findById(productId);
      if (!product) throw new Error(`Product ${productId} not found`);
      totalAmount += product.price;
    }

    const order = new Order({ ...orderData, totalAmount });
    return await this.orderRepository.save(order);
  }

  async getAllOrders() {
    return await this.orderRepository.findAll();
  }

  async getOrderById(id) {
    return await this.orderRepository.findById(id);
  }
}
