import type { Contract } from '../../data/database';

export function getMonthlyContractCost(contract: Pick<Contract, 'costCents' | 'billingCycle'>): number {
  return contract.billingCycle === 'yearly' ? Math.round(contract.costCents / 12) : contract.costCents;
}

export function getYearlyContractCost(contract: Pick<Contract, 'costCents' | 'billingCycle'>): number {
  return contract.billingCycle === 'yearly' ? contract.costCents : contract.costCents * 12;
}

export function calculateWarrantyEnd(purchaseDate: string, months: number): string | null {
  if (!purchaseDate || !Number.isInteger(months) || months <= 0) return null;
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function calculateNoticeDate(date: string, noticeDays: number): string {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() - noticeDays);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
}
