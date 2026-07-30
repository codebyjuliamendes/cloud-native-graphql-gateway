export class Order {
  constructor({ id, userId, productIds, totalAmount }) {
    if (!userId || !productIds || productIds.length === 0) {
      throw new Error('Order must have a userId and at least one productId');
    }
    this.id = id;
    this.userId = userId;
    this.productIds = productIds;
    this.totalAmount = totalAmount;
  }
}
