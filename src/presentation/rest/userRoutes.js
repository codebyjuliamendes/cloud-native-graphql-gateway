import { Router } from 'express';
import Joi from 'joi';
import { userUseCases } from '../../infrastructure/dependencies.js';
import { validate } from '../middlewares/validator.js';

const router = Router();

const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});

router.get('/', async (req, res, next) => {
  try {
    const users = await userUseCases.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await userUseCases.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await userUseCases.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
