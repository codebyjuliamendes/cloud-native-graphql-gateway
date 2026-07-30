export class Product {
  constructor({ id, name, price }) {
    if (!name || price === undefined) {
      throw new Error('Product name and price are required');
    }
    if (price < 0) {
      throw new Error('Price must be greater than or equal to 0');
    }
    this.id = id;
    this.name = name;
    this.price = price;
  }
}
