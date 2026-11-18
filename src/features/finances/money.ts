import type { TransactionRecord } from '../../data/database';

export function parseMoneyToCents(value: string): number | null {
  let clean = value.trim().replace(/[€$£\s\u00a0]/g, '');
  if (!clean) return null;
  const comma = clean.lastIndexOf(',');
  const dot = clean.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    clean = comma > dot ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '');
  } else if (comma >= 0) clean = clean.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const amount = Number(clean);
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER / 100) return null;
  return Math.round(amount * 100);
}

export function summarizeTransactions(transactions: TransactionRecord[]) {
  const summary = { incomeCents: 0, expenseCents: 0, netCents: 0, expenseByCategory: new Map<string, number>() };
  for (const transaction of transactions) {
    if (transaction.kind === 'income') summary.incomeCents += transaction.amountCents;
    else {
      summary.expenseCents += transaction.amountCents;
      summary.expenseByCategory.set(transaction.category, (summary.expenseByCategory.get(transaction.category) ?? 0) + transaction.amountCents);
    }
  }
  summary.netCents = summary.incomeCents - summary.expenseCents;
  return summary;
}
