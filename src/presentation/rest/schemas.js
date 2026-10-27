import Joi from 'joi';
import { MAX_PAGE_SIZE } from '../../application/pagination.js';
import { MAX_ORDER_ITEMS } from '../../domain/Order.js';
import { PRODUCT_NAME_MAX } from '../../domain/Product.js';
import { EMAIL_MAX, USER_NAME_MAX } from '../../domain/User.js';

export const pageQuery = Joi.object({
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE),
  offset: Joi.number().integer().min(0),
});

export const idParam = Joi.string().max(64).required();

export const createUserBody = Joi.object({
  name: Joi.string().trim().max(USER_NAME_MAX).required(),
  email: Joi.string().trim().email().max(EMAIL_MAX).required(),
});

export const createProductBody = Joi.object({
  name: Joi.string().trim().max(PRODUCT_NAME_MAX).required(),
  price: Joi.number().strict().min(0).required(),
});

export const createOrderBody = Joi.object({
  userId: Joi.string().max(64).required(),
  productIds: Joi.array().items(Joi.string().max(64)).min(1).max(MAX_ORDER_ITEMS).required(),
});
