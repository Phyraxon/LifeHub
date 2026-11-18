import type { HouseholdRecurrence } from '../../data/database';

export function advanceDueDate(dueAt: string, recurrence: HouseholdRecurrence, today: Date): string | null {
  if (recurrence === 'none') return null;
  const current = new Date(`${dueAt}T12:00:00`);
  const todayKey = keyOf(today);
  const anchorDay = current.getDate();
  let next = addInterval(current, recurrence, anchorDay);
  while (keyOf(next) <= todayKey) next = addInterval(next, recurrence, anchorDay);
  return keyOf(next);
}

const keyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function addInterval(date: Date, recurrence: Exclude<HouseholdRecurrence, 'none'>, anchorDay: number): Date {
  const next = new Date(date);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else {
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(anchorDay, lastDay));
  }
  return next;
}
