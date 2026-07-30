import { Product } from '../../domain/Product.js';

export class ProductUseCases {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async createProduct(productData) {
    const product = new Product(productData);
    return await this.productRepository.save(product);
  }

  async getAllProducts() {
    return await this.productRepository.findAll();
  }

  async getProductById(id) {
    return await this.productRepository.findById(id);
  }
}
