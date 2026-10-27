import { ValidationError } from '../../src/domain/errors.js';
import { fromCents, sumAmounts, toCents } from '../../src/domain/money.js';

describe('money', () => {
  it('sums decimal amounts without floating point drift', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([19.99, 0.01, 5.1])).toBe(25.1);
    expect(sumAmounts([])).toBe(0);
  });

  it('converts to and from cents', () => {
    expect(toCents(12.34)).toBe(1234);
    expect(fromCents(1234)).toBe(12.34);
  });

  it('rejects invalid amounts', () => {
    expect(() => toCents(1.234)).toThrow(ValidationError);
    expect(() => toCents(Infinity)).toThrow(ValidationError);
  });
});
