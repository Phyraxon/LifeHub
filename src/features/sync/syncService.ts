import { db } from '../../data/database';
import { createBackupJson, encryptBackup, parseBackup, tableNames, type ImportPlan } from '../backup/backupService';
import type { SyncProvider } from './SyncProvider';

const deviceKey = 'lifehub-sync-device-id';

export function getSyncDeviceId(): string {
  let id = localStorage.getItem(deviceKey);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(deviceKey, id); }
  return id;
}

async function encodeRow(row: Record<string, unknown>): Promise<string> {
  const normalized = { ...row };
  if (normalized.blob instanceof Blob) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await normalized.blob.arrayBuffer()));
    normalized.blob = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return JSON.stringify(normalized);
}

async function newerRow(left: Record<string, unknown>, right: Record<string, unknown>): Promise<Record<string, unknown>> {
  const leftDate = typeof left.updatedAt === 'string' ? left.updatedAt : '';
  const rightDate = typeof right.updatedAt === 'string' ? right.updatedAt : '';
  if (leftDate !== rightDate) return leftDate > rightDate ? left : right;
  return await encodeRow(left) >= await encodeRow(right) ? left : right;
}

export async function mergeSyncPlans(plans: ImportPlan[]): Promise<ImportPlan> {
  const rows = {} as ImportPlan['rows'];
  const duplicates = {} as ImportPlan['duplicates'];
  const tombstones = new Map<string, Record<string, unknown>>();
  for (const plan of plans) for (const item of plan.rows.syncTombstones) {
    const key = String(item.id);
    const previous = tombstones.get(key);
    tombstones.set(key, previous ? await newerRow(previous, item) : item);
  }

  let total = 0;
  for (const tableName of tableNames) {
    if (tableName === 'syncTombstones') {
      rows[tableName] = [...tombstones.values()]; duplicates[tableName] = 0; total += rows[tableName].length; continue;
    }
    const byId = new Map<string, Record<string, unknown>>();
    for (const plan of plans) for (const item of plan.rows[tableName]) {
      const key = String(item.id);
      const previous = byId.get(key);
      byId.set(key, previous ? await newerRow(previous, item) : item);
    }
    rows[tableName] = [...byId.values()].filter(item => {
      const deletion = tombstones.get(`${tableName}:${String(item.id)}`);
      return !deletion;
    });
    duplicates[tableName] = 0;
    total += rows[tableName].length;
  }
  return { rows, duplicates, total };
}

async function restoreMergedPlan(plan: ImportPlan): Promise<void> {
  const tables = tableNames.map(name => db.table(name));
  await db.transaction('rw', tables, async () => {
    for (const tableName of tableNames) {
      if (tableName === 'syncTombstones' || tableName === 'settings') continue;
      const rows = plan.rows[tableName];
      const localIds = await db.table(tableName).toCollection().primaryKeys();
      const keep = new Set(rows.map(row => String(row.id)));
      const tombstoneIds = new Set(plan.rows.syncTombstones.filter(item => item.tableName === tableName).map(item => String(item.recordId)));
      for (const id of localIds) if (tombstoneIds.has(String(id)) && !keep.has(String(id))) await db.table(tableName).delete(id);
      if (rows.length) await db.table(tableName).bulkPut(rows as never[]);
    }
    if (plan.rows.settings.length) await db.settings.bulkPut(plan.rows.settings as never[]);
    if (plan.rows.syncTombstones.length) await db.syncTombstones.bulkPut(plan.rows.syncTombstones as never[]);
  });
}

export interface SyncResult {
  snapshotsMerged: number;
  recordsAvailable: number;
  syncedAt: string;
}

export async function synchronize(provider: SyncProvider, passphrase: string): Promise<SyncResult> {
  if (passphrase.trim().length < 12) throw new Error('Dein Sync-Passwort muss mindestens 12 Zeichen lang sein.');
  const localPlan = await parseBackup(await createBackupJson());
  const snapshots = await provider.listSnapshots();
  const plans = [localPlan];
  for (const snapshot of snapshots) plans.push(await parseBackup(await provider.readSnapshot(snapshot.id), passphrase));
  const merged = await mergeSyncPlans(plans);
  await restoreMergedPlan(merged);
  const encrypted = await encryptBackup(await createBackupJson(), passphrase);
  await provider.writeSnapshot(getSyncDeviceId(), encrypted);
  return { snapshotsMerged: snapshots.length, recordsAvailable: merged.total, syncedAt: new Date().toISOString() };
}
