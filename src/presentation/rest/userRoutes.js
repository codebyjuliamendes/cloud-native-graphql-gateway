import { createResourceRouter } from './resourceRouter.js';
import { createUserBody } from './schemas.js';

/** @param {import('../../application/useCases/userUseCases.js').UserUseCases} users */
export const createUserRoutes = (users) =>
  createResourceRouter({
    label: 'User',
    list: (page) => users.getAllUsers(page),
    get: (id) => users.getUserById(id),
    create: (body) => users.createUser(body),
    createSchema: createUserBody,
  });
