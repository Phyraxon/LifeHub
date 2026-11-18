import { describe, expect, it } from 'vitest';
import { calculateNoticeDate, calculateWarrantyEnd, getMonthlyContractCost, getYearlyContractCost } from './calculations';

describe('contracts and warranty calculations', () => {
  it('normalizes monthly and yearly recurring costs accurately in cents', () => {
    const monthly = { costCents: 1299, billingCycle: 'monthly' as const };
    const yearly = { costCents: 11988, billingCycle: 'yearly' as const };
    expect(getMonthlyContractCost(monthly)).toBe(1299);
    expect(getYearlyContractCost(monthly)).toBe(15588);
    expect(getMonthlyContractCost(yearly)).toBe(999);
    expect(getYearlyContractCost(yearly)).toBe(11988);
  });

  it('clamps warranty dates at the end of shorter months and leap years', () => {
    expect(calculateWarrantyEnd('2026-01-31', 1)).toBe('2026-02-28');
    expect(calculateWarrantyEnd('2024-01-31', 1)).toBe('2024-02-29');
    expect(calculateWarrantyEnd('2026-05-18', 24)).toBe('2028-05-18');
  });

  it('calculates the notice date before a renewal date', () => {
    expect(calculateNoticeDate('2026-12-01', 30)).toBe('2026-11-01');
    expect(calculateNoticeDate('2026-03-01', 2)).toBe('2026-02-27');
  });
});
