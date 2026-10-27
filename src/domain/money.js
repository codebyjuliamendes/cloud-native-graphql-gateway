import { ValidationError } from './errors.js';

/** Largest accepted unit price (in currency units). */
export const MAX_PRICE = 1_000_000_000;

/**
 * Converts a decimal amount to integer cents, rejecting values with more than
 * two decimal places so that totals never accumulate floating point drift.
 * @param {number} amount
 * @returns {number}
 */
export function toCents(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new ValidationError('Amount must be a finite number');
  }
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > 1e-6) {
    throw new ValidationError('Amount must have at most two decimal places');
  }
  return cents;
}

/** @param {number} cents */
export function fromCents(cents) {
  return cents / 100;
}

/**
 * Sums decimal amounts exactly (via integer cents).
 * @param {number[]} amounts
 */
export function sumAmounts(amounts) {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));
}
