import { Router } from 'express';
import Joi from 'joi';
import { orderUseCases } from '../../infrastructure/dependencies.js';
import { validate } from '../middlewares/validator.js';

const router = Router();

const createOrderSchema = Joi.object({
  userId: Joi.string().required(),
  productIds: Joi.array().items(Joi.string()).min(1).required()
});

router.get('/', async (req, res, next) => {
  try {
    const orders = await orderUseCases.getAllOrders();
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const order = await orderUseCases.createOrder(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await orderUseCases.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

export default router;
