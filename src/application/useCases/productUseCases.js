import { Product } from '../../domain/Product.js';
import { normalizePage } from '../pagination.js';

export class ProductUseCases {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async createProduct(productData) {
    const product = new Product(productData);
    return this.productRepository.save(product);
  }

  async getAllProducts(page) {
    return this.productRepository.findAll(normalizePage(page));
  }

  async getProductById(id) {
    return this.productRepository.findById(id);
  }
}
