import { describe, expect, it } from 'vitest';
import type { TransactionRecord } from '../../data/database';
import { parseMoneyToCents, summarizeTransactions } from './money';

const transaction = (kind: TransactionRecord['kind'], category: string, amountCents: number): TransactionRecord => ({
  id: crypto.randomUUID(), title: 'entry', date: '2026-11-18', kind, category, amountCents,
  createdAt: '', updatedAt: '',
});

describe('finance arithmetic', () => {
  it('parses comma and dot decimal formats into integer cents', () => {
    expect(parseMoneyToCents('12,34')).toBe(1234);
    expect(parseMoneyToCents('1.234,56 €')).toBe(123456);
    expect(parseMoneyToCents('1,234.56')).toBe(123456);
    expect(parseMoneyToCents('0,10')).toBe(10);
  });

  it('rejects malformed and negative values', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('-3,00')).toBeNull();
    expect(parseMoneyToCents('1,234')).toBeNull();
  });

  it('calculates income, expenses, net and category totals in cents', () => {
    const result = summarizeTransactions([
      transaction('income', 'Gehalt', 250000),
      transaction('expense', 'Lebensmittel', 5423),
      transaction('expense', 'Lebensmittel', 1277),
      transaction('expense', 'Wohnen', 100000),
    ]);
    expect(result.incomeCents).toBe(250000);
    expect(result.expenseCents).toBe(106700);
    expect(result.netCents).toBe(143300);
    expect(result.expenseByCategory.get('Lebensmittel')).toBe(6700);
  });
});
