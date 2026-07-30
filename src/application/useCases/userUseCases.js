import { User } from '../../domain/User.js';

export class UserUseCases {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async createUser(userData) {
    const user = new User(userData);
    return await this.userRepository.save(user);
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async getUserById(id) {
    return await this.userRepository.findById(id);
  }
}
