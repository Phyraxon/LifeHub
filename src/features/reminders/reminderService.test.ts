import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/database';
import { getReminders } from './reminderService';

describe('derived reminders', () => {
  beforeEach(async () => { await db.open(); await Promise.all([db.tasks.clear(), db.events.clear(), db.householdTasks.clear(), db.contracts.clear(), db.devices.clear(), db.documents.clear()]); });

  it('generates one reminder per due task and does not repeat completed task reminders', async () => {
    const now = new Date(2026, 10, 18, 12);
    const record = { id: 'task-1', title: 'Call dentist', notes: '', dueAt: '2026-11-18', priority: 'medium' as const, completedAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    await db.tasks.add(record);
    const results = await getReminders(now);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'task:task-1', detail: 'Heute fällig', route: '/aufgaben', severity: 'soon' });
    await db.tasks.update('task-1', { completedAt: now.toISOString() });
    expect(await getReminders(now)).toHaveLength(0);
  });

  it('adds the contract notice only when it falls in the next 30 days', async () => {
    const now = new Date(2026, 10, 18, 12);
    const common = { provider: 'Provider', costCents: 1000, billingCycle: 'monthly' as const, startedAt: '2026-01-01', endsAt: null, noticeDays: 30, documentId: null, notes: '', createdAt: now.toISOString(), updatedAt: now.toISOString() };
    await db.contracts.bulkAdd([
      { id: 'soon', name: 'Soon', ...common, renewalAt: '2026-12-20' },
      { id: 'later', name: 'Later', ...common, renewalAt: '2027-03-10' },
    ]);
    expect(await getReminders(now)).toMatchObject([{ id: 'contract:soon', date: '2026-11-20', route: '/vertraege' }]);
  });
});
