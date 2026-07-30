import { Router } from 'express';
import Joi from 'joi';
import { productUseCases } from '../../infrastructure/dependencies.js';
import { validate } from '../middlewares/validator.js';

const router = Router();

const createProductSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().min(0).required()
});

router.get('/', async (req, res, next) => {
  try {
    const products = await productUseCases.getAllProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createProductSchema), async (req, res, next) => {
  try {
    const product = await productUseCases.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await productUseCases.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;
