import { describe, expect, it } from 'vitest';
import type { Task } from '../../data/database';
import { filterTasks, getTaskCounts } from './taskFilters';

const referenceDate = new Date(2026, 10, 18, 12);
const makeTask = (id: string, dueAt: string | null, completedAt: string | null = null, title = id): Task => ({
  id, title, notes: '', dueAt, priority: 'medium', completedAt,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
});

const tasks = [
  makeTask('late', '2026-11-17'), makeTask('today', '2026-11-18'),
  makeTask('week', '2026-11-24'), makeTask('later', '2026-11-26'),
  makeTask('done-late', '2026-11-10', '2026-11-17T10:00:00.000Z'),
  makeTask('no-date', null, null, 'Buy coffee filters'),
];

describe('task filters', () => {
  it('separates overdue, today, this week, and completed items', () => {
    expect(filterTasks(tasks, 'overdue', '', referenceDate).map(task => task.id)).toEqual(['late']);
    expect(filterTasks(tasks, 'today', '', referenceDate).map(task => task.id)).toEqual(['today']);
    expect(filterTasks(tasks, 'week', '', referenceDate).map(task => task.id)).toEqual(['today', 'week']);
    expect(filterTasks(tasks, 'done', '', referenceDate).map(task => task.id)).toEqual(['done-late']);
  });

  it('searches title and notes without changing completion filtering', () => {
    expect(filterTasks(tasks, 'all', 'COFFEE', referenceDate).map(task => task.id)).toEqual(['no-date']);
    expect(filterTasks(tasks, 'done', 'coffee', referenceDate)).toEqual([]);
  });

  it('counts open and completed tasks consistently', () => {
    expect(getTaskCounts(tasks, referenceDate)).toEqual({ all: 5, today: 1, week: 2, overdue: 1, done: 1 });
  });
});
