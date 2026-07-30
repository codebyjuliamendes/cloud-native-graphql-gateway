import { db } from './database.js';
import { UserRepository } from './repositories/userRepository.js';
import { ProductRepository } from './repositories/productRepository.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { UserUseCases } from '../application/useCases/userUseCases.js';
import { ProductUseCases } from '../application/useCases/productUseCases.js';
import { OrderUseCases } from '../application/useCases/orderUseCases.js';

export const userRepository = new UserRepository(db);
export const productRepository = new ProductRepository(db);
export const orderRepository = new OrderRepository(db);

export const userUseCases = new UserUseCases(userRepository);
export const productUseCases = new ProductUseCases(productRepository);
export const orderUseCases = new OrderUseCases(orderRepository, productRepository, userRepository);
