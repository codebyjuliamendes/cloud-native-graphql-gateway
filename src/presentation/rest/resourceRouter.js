import { Router } from 'express';
import { NotFoundError } from '../../domain/errors.js';
import { validate } from '../http/validator.js';
import { idParam, pageQuery } from './schemas.js';

/**
 * Generic list / get / create router for a resource.
 * @param {{
 *   label: string,
 *   list: (page: object) => Promise<unknown[]>,
 *   get: (id: string) => Promise<unknown>,
 *   create: (body: object) => Promise<unknown>,
 *   createSchema: import('joi').Schema,
 * }} resource
 */
export function createResourceRouter({ label, list, get, create, createSchema }) {
  const router = Router();

  router.get('/', validate(pageQuery, 'query'), async (req, res) => {
    res.json(await list(req.validated.query));
  });

  router.post('/', validate(createSchema), async (req, res) => {
    res.status(201).json(await create(req.validated.body));
  });

  router.get('/:id', async (req, res) => {
    const { error } = idParam.validate(req.params.id);
    const item = error ? null : await get(req.params.id);
    if (!item) throw new NotFoundError(`${label} not found`);
    res.json(item);
  });

  return router;
}
