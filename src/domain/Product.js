import { ValidationError } from './errors.js';
import { MAX_PRICE, toCents } from './money.js';

export const PRODUCT_NAME_MAX = 200;

export class Product {
  constructor({ id, name, price }) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || price === undefined || price === null) {
      throw new ValidationError('Product name and price are required');
    }
    if (cleanName.length > PRODUCT_NAME_MAX) {
      throw new ValidationError(`Product name must be at most ${PRODUCT_NAME_MAX} characters`);
    }
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new ValidationError('Price must be a finite number');
    }
    if (price < 0) {
      throw new ValidationError('Price must be greater than or equal to 0');
    }
    if (price > MAX_PRICE) {
      throw new ValidationError(`Price must be at most ${MAX_PRICE}`);
    }
    toCents(price); // rejects more than two decimal places
    this.id = id;
    this.name = cleanName;
    this.price = price;
  }
}
