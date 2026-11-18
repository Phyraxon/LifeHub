import { describe, expect, it } from 'vitest';
import { calculateShoppingTotals } from './totals';

describe('shopping totals', () => {
  it('multiplies quantity by unit price and rounds each line to cents', () => {
    expect(calculateShoppingTotals([
      { quantity: 3, price: 0.1, checkedAt: null },
      { quantity: 2, price: 1.25, checkedAt: '2026-11-18T12:00:00.000Z' },
      { quantity: 1, price: null, checkedAt: null },
    ])).toEqual({ total: 2.8, open: 0.3 });
  });

  it('returns zero totals for an empty list', () => {
    expect(calculateShoppingTotals([])).toEqual({ total: 0, open: 0 });
  });
});
