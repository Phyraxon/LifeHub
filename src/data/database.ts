import Dexie, { type EntityTable } from 'dexie';

export interface RecordBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings extends RecordBase {
  key: 'app';
  theme: 'system' | 'dark' | 'light';
  language: 'de' | 'en';
  currency: string;
  onboardingComplete: boolean;
}

export interface Task extends RecordBase {
  title: string;
  notes: string;
  dueAt: string | null;
  priority: 'low' | 'medium' | 'high';
  completedAt: string | null;
}

export interface CalendarEvent extends RecordBase {
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  category: string;
  color: string;
  notes: string;
}

class LifehubDatabase extends Dexie {
  settings!: EntityTable<AppSettings, 'key'>;
  tasks!: EntityTable<Task, 'id'>;
  events!: EntityTable<CalendarEvent, 'id'>;
  householdTasks!: EntityTable<RecordBase, 'id'>;
  rooms!: EntityTable<RecordBase, 'id'>;
  transactions!: EntityTable<RecordBase, 'id'>;
  budgets!: EntityTable<RecordBase, 'id'>;
  savingsGoals!: EntityTable<RecordBase, 'id'>;
  shoppingLists!: EntityTable<RecordBase, 'id'>;
  shoppingItems!: EntityTable<RecordBase, 'id'>;
  documents!: EntityTable<RecordBase, 'id'>;
  contracts!: EntityTable<RecordBase, 'id'>;
  subscriptions!: EntityTable<RecordBase, 'id'>;
  devices!: EntityTable<RecordBase, 'id'>;
  notes!: EntityTable<RecordBase, 'id'>;
  categories!: EntityTable<RecordBase, 'id'>;
  tags!: EntityTable<RecordBase, 'id'>;
  reminders!: EntityTable<RecordBase, 'id'>;
  attachments!: EntityTable<RecordBase, 'id'>;

  constructor() {
    super('LifehubDatabase');
    this.version(1).stores({
      settings: '&key, updatedAt',
      tasks: 'id, title, dueAt, completedAt, priority, createdAt, updatedAt',
      events: 'id, createdAt, updatedAt',
      householdTasks: 'id, createdAt, updatedAt', rooms: 'id, createdAt, updatedAt',
      transactions: 'id, createdAt, updatedAt', budgets: 'id, createdAt, updatedAt', savingsGoals: 'id, createdAt, updatedAt',
      shoppingLists: 'id, createdAt, updatedAt', shoppingItems: 'id, createdAt, updatedAt',
      documents: 'id, createdAt, updatedAt', contracts: 'id, createdAt, updatedAt', subscriptions: 'id, createdAt, updatedAt',
      devices: 'id, createdAt, updatedAt', notes: 'id, createdAt, updatedAt', categories: 'id, createdAt, updatedAt',
      tags: 'id, createdAt, updatedAt', reminders: 'id, createdAt, updatedAt', attachments: 'id, createdAt, updatedAt',
    });
    this.version(2).stores({ events: 'id, startAt, createdAt, updatedAt' });
  }
}

export const db = new LifehubDatabase();

export const defaultSettings: AppSettings = {
  key: 'app', id: 'app', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  theme: 'system', language: 'de', currency: 'EUR', onboardingComplete: false,
};
