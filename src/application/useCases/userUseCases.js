import { User } from '../../domain/User.js';
import { normalizePage } from '../pagination.js';

export class UserUseCases {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async createUser(userData) {
    const user = new User(userData);
    return this.userRepository.save(user);
  }

  async getAllUsers(page) {
    return this.userRepository.findAll(normalizePage(page));
  }

  async getUserById(id) {
    return this.userRepository.findById(id);
  }
}
