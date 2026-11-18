import { db } from '../../data/database';
import type { BackupTableName } from '../backup/backupService';

export type SyncableTable = Exclude<BackupTableName, 'settings' | 'syncTombstones'>;

export async function deleteSyncedRecords(records: Array<{ table: SyncableTable; ids: string[] }>): Promise<void> {
  const tables = [...new Set(records.map(record => record.table))];
  const dexieTables = tables.map(name => db.table(name));
  const deletedAt = new Date().toISOString();
  await db.transaction('rw', [...dexieTables, db.syncTombstones], async () => {
    for (const { table: tableName, ids } of records) {
      const table = db.table(tableName);
      for (const recordId of new Set(ids)) {
        if (!await table.get(recordId)) continue;
        await db.syncTombstones.put({ id: `${tableName}:${recordId}`, tableName, recordId, deletedAt, createdAt: deletedAt, updatedAt: deletedAt });
        await table.delete(recordId);
      }
    }
  });
}
