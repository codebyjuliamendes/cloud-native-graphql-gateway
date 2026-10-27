import { ValidationError } from '../domain/errors.js';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes pagination input shared by REST and GraphQL.
 * @param {{ limit?: number, offset?: number }} [input]
 * @returns {{ limit: number, offset: number }}
 */
export function normalizePage({ limit, offset } = {}) {
  const pageLimit = limit ?? DEFAULT_PAGE_SIZE;
  const pageOffset = offset ?? 0;
  if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > MAX_PAGE_SIZE) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  if (!Number.isInteger(pageOffset) || pageOffset < 0) {
    throw new ValidationError('offset must be a non-negative integer');
  }
  return { limit: pageLimit, offset: pageOffset };
}
