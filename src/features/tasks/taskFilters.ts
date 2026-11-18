import type { Task } from '../../data/database';

export type TaskFilter = 'all' | 'today' | 'week' | 'overdue' | 'done';
export interface TaskCounts { all: number; today: number; week: number; overdue: number; done: number }

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function filterTasks(tasks: Task[], filter: TaskFilter, query = '', referenceDate = new Date()): Task[] {
  const now = dayKey(referenceDate);
  const end = new Date(referenceDate); end.setDate(end.getDate() + 7);
  const weekEnd = dayKey(end);
  const term = query.trim().toLocaleLowerCase();
  return tasks.filter(task => {
    if (filter === 'done' && !task.completedAt) return false;
    if (filter !== 'done' && task.completedAt) return false;
    if (filter === 'today' && task.dueAt !== now) return false;
    if (filter === 'week' && (!task.dueAt || task.dueAt < now || task.dueAt > weekEnd)) return false;
    if (filter === 'overdue' && (!task.dueAt || task.dueAt >= now)) return false;
    return !term || `${task.title} ${task.notes}`.toLocaleLowerCase().includes(term);
  });
}

export function getTaskCounts(tasks: Task[], referenceDate = new Date()): TaskCounts {
  const now = dayKey(referenceDate);
  const end = new Date(referenceDate); end.setDate(end.getDate() + 7);
  const weekEnd = dayKey(end);
  const open = tasks.filter(task => !task.completedAt);
  return {
    all: open.length,
    today: open.filter(task => task.dueAt === now).length,
    week: open.filter(task => task.dueAt !== null && task.dueAt >= now && task.dueAt <= weekEnd).length,
    overdue: open.filter(task => task.dueAt !== null && task.dueAt < now).length,
    done: tasks.length - open.length,
  };
}
