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

export interface ShoppingList extends RecordBase {
  name: string;
}

export type ShoppingCategory = 'Lebensmittel' | 'Getränke' | 'Drogerie' | 'Haushalt' | 'Technik' | 'Kleidung' | 'Sonstiges';

export interface ShoppingItem extends RecordBase {
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  price: number | null;
  checkedAt: string | null;
  favorite: boolean;
}

export interface Room extends RecordBase {
  name: string;
}

export type HouseholdRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface HouseholdTask extends RecordBase {
  title: string;
  roomId: string | null;
  dueAt: string | null;
  recurrence: HouseholdRecurrence;
  completedAt: string | null;
  lastCompletedAt: string | null;
  notes: string;
}

export interface TransactionRecord extends RecordBase {
  title: string;
  date: string;
  kind: 'income' | 'expense';
  category: string;
  amountCents: number;
}

export interface Budget extends RecordBase {
  month: string;
  amountCents: number;
}

export interface SavingsGoal extends RecordBase {
  title: string;
  targetCents: number;
  savedCents: number;
  dueAt: string | null;
}

export type DocumentCategory = 'Rechnungen' | 'Versicherungen' | 'Verträge' | 'Bescheide' | 'Garantien' | 'Anleitungen' | 'Persönliches' | 'Sonstiges';

export interface StoredDocument extends RecordBase {
  name: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  description: string;
  tags: string[];
  issuedAt: string | null;
  expiresAt: string | null;
  blob: Blob;
}

export interface Contract extends RecordBase {
  name: string;
  provider: string;
  costCents: number;
  billingCycle: 'monthly' | 'yearly';
  startedAt: string;
  endsAt: string | null;
  renewalAt: string | null;
  noticeDays: number;
  documentId: string | null;
  notes: string;
}

export interface Device extends RecordBase {
  name: string;
  manufacturer: string;
  purchaseDate: string | null;
  priceCents: number | null;
  retailer: string;
  serialNumber: string;
  warrantyMonths: number;
  warrantyEndAt: string | null;
  documentId: string | null;
  notes: string;
}

export interface Note extends RecordBase {
  title: string;
  content: string;
  category: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
}

export interface SyncTombstone extends RecordBase {
  id: string;
  tableName: string;
  recordId: string;
  deletedAt: string;
}

class LifehubDatabase extends Dexie {
  settings!: EntityTable<AppSettings, 'key'>;
  tasks!: EntityTable<Task, 'id'>;
  events!: EntityTable<CalendarEvent, 'id'>;
  householdTasks!: EntityTable<HouseholdTask, 'id'>;
  rooms!: EntityTable<Room, 'id'>;
  transactions!: EntityTable<TransactionRecord, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  savingsGoals!: EntityTable<SavingsGoal, 'id'>;
  shoppingLists!: EntityTable<ShoppingList, 'id'>;
  shoppingItems!: EntityTable<ShoppingItem, 'id'>;
  documents!: EntityTable<StoredDocument, 'id'>;
  contracts!: EntityTable<Contract, 'id'>;
  subscriptions!: EntityTable<RecordBase, 'id'>;
  devices!: EntityTable<Device, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  categories!: EntityTable<RecordBase, 'id'>;
  tags!: EntityTable<RecordBase, 'id'>;
  reminders!: EntityTable<RecordBase, 'id'>;
  attachments!: EntityTable<RecordBase, 'id'>;
  syncTombstones!: EntityTable<SyncTombstone, 'id'>;

  constructor(name = 'LifehubDatabase') {
    super(name);
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
    this.version(3).stores({ shoppingLists: 'id, name, createdAt, updatedAt', shoppingItems: 'id, listId, checkedAt, category, createdAt, updatedAt' });
    this.version(4).stores({ householdTasks: 'id, roomId, dueAt, completedAt, recurrence, createdAt, updatedAt', rooms: 'id, name, createdAt, updatedAt' });
    this.version(5).stores({ transactions: 'id, date, kind, category, createdAt, updatedAt', budgets: 'id, month, createdAt, updatedAt', savingsGoals: 'id, title, dueAt, createdAt, updatedAt' });
    this.version(6).stores({ documents: 'id, name, category, issuedAt, expiresAt, createdAt, updatedAt' });
    this.version(7).stores({ contracts: 'id, provider, renewalAt, endsAt, createdAt, updatedAt', devices: 'id, name, purchaseDate, warrantyEndAt, createdAt, updatedAt' });
    this.version(8).stores({ notes: 'id, title, category, favorite, archived, createdAt, updatedAt' });
    this.version(9).stores({ syncTombstones: 'id, tableName, recordId, deletedAt' });
  }
}

const databases = new Map<string, LifehubDatabase>();
const legacyDatabaseKey = '__legacy__';
let activeProfileId: string | null = null;

function namedDatabase(key: string): LifehubDatabase {
  let instance = databases.get(key);
  if (!instance) {
    instance = new LifehubDatabase(key === legacyDatabaseKey ? 'LifehubDatabase' : `LifehubDatabase-${key}`);
    databases.set(key, instance);
  }
  return instance;
}

export function setActiveProfileDatabase(profileId: string): void { activeProfileId = profileId; }
export function clearActiveProfileDatabase(): void { activeProfileId = null; }
export function getActiveProfileDatabaseId(): string | null { return activeProfileId; }

export async function migrateLegacyDatabaseToProfile(profileId: string): Promise<void> {
  if (localStorage.getItem('lifehub-legacy-database-owner')) return;
  const legacy = namedDatabase(legacyDatabaseKey);
  const destination = namedDatabase(profileId);
  await Promise.all([legacy.open(), destination.open()]);
  await destination.transaction('rw', destination.tables, async () => {
    for (const legacyTable of legacy.tables) {
      const records = await legacy.table(legacyTable.name).toArray();
      if (!records.length) continue;
      const destinationTable = destination.table(legacyTable.name);
      if (await destinationTable.count() === 0) await destinationTable.bulkPut(records as never[]);
    }
  });
  localStorage.setItem('lifehub-legacy-database-owner', profileId);
}

export async function migratePreviousProfileToGoogleAccount(email: string, googleProfileId: string): Promise<void> {
  const migrationKey = `lifehub-google-profile-migrated:${googleProfileId}`;
  if (localStorage.getItem(migrationKey)) return;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase())));
  const previousId = [...digest].slice(0, 16).map(value => value.toString(16).padStart(2, '0')).join('');
  if (previousId === googleProfileId) return;
  const source = namedDatabase(previousId);
  const destination = namedDatabase(googleProfileId);
  await Promise.all([source.open(), destination.open()]);
  await destination.transaction('rw', destination.tables, async () => {
    for (const sourceTable of source.tables) {
      const destinationTable = destination.table(sourceTable.name);
      if (await destinationTable.count() !== 0) continue;
      const records = await source.table(sourceTable.name).toArray();
      if (records.length) await destinationTable.bulkPut(records as never[]);
    }
  });
  localStorage.setItem(migrationKey, 'done');
}

export const db = new Proxy({} as LifehubDatabase, {
  get(_target, property) {
    const instance = namedDatabase(activeProfileId ?? legacyDatabaseKey);
    const value = Reflect.get(instance, property, instance) as unknown;
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  set(_target, property, value) {
    const instance = namedDatabase(activeProfileId ?? legacyDatabaseKey);
    return Reflect.set(instance, property, value, instance);
  },
});

export const defaultSettings: AppSettings = {
  key: 'app', id: 'app', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  theme: 'system', language: 'de', currency: 'EUR', onboardingComplete: false,
};
