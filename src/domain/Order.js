import { ValidationError } from './errors.js';

/** Maximum number of product lines in one order. */
export const MAX_ORDER_ITEMS = 100;

export class Order {
  constructor({ id, userId, productIds, totalAmount }) {
    if (!userId || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ValidationError('Order must have a userId and at least one productId');
    }
    if (productIds.length > MAX_ORDER_ITEMS) {
      throw new ValidationError(`Order can have at most ${MAX_ORDER_ITEMS} products`);
    }
    if (productIds.some((productId) => typeof productId !== 'string' || !productId)) {
      throw new ValidationError('Every productId must be a non-empty string');
    }
    this.id = id;
    this.userId = userId;
    this.productIds = productIds;
    this.totalAmount = totalAmount;
  }
}
