import { describe, expect, it } from 'vitest';
import { advanceDueDate } from './recurrence';

describe('household recurrence', () => {
  it('advances a due chore until the next date after completion day', () => {
    expect(advanceDueDate('2026-11-01', 'weekly', new Date(2026, 10, 18))).toBe('2026-11-22');
    expect(advanceDueDate('2026-11-18', 'daily', new Date(2026, 10, 18))).toBe('2026-11-19');
  });

  it('clamps monthly repeats to the last day of short months', () => {
    expect(advanceDueDate('2026-01-31', 'monthly', new Date(2026, 0, 31))).toBe('2026-02-28');
    expect(advanceDueDate('2026-01-31', 'monthly', new Date(2026, 2, 1))).toBe('2026-03-31');
  });

  it('returns no next due date for a one-time chore', () => {
    expect(advanceDueDate('2026-11-18', 'none', new Date(2026, 10, 18))).toBeNull();
  });
});
