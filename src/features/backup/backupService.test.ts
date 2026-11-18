import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/database';
import { encryptBackup, parseBackup, restoreBackup, tableNames } from './backupService';

const sampleTask = { id: 'task-backup-test', title: 'Keep this local', notes: '', dueAt: null, priority: 'medium', completedAt: null, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };
function sampleBackup(documents: unknown[] = []) {
  const tables: Record<string, unknown[]> = Object.fromEntries(tableNames.map(name => [name, []]));
  tables.tasks = [sampleTask]; tables.documents = documents;
  return JSON.stringify({ format: 'LIFEHUB_BACKUP', version: 1, exportedAt: '2026-11-18T10:00:00.000Z', tables });
}

describe('backup import and encryption', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.tasks.clear(), db.documents.clear()]);
  });

  it('encrypts with AES-GCM and restores without overwriting duplicate IDs', async () => {
    const encoded = await encryptBackup(sampleBackup(), 'correct horse battery staple');
    const plan = await parseBackup(encoded, 'correct horse battery staple');
    expect(plan.total).toBe(1);
    expect(plan.duplicates.tasks).toBe(0);
    expect(await restoreBackup(plan)).toEqual({ imported: 1, skipped: 0 });
    const duplicatePlan = await parseBackup(encoded, 'correct horse battery staple');
    expect(duplicatePlan.duplicates.tasks).toBe(1);
    expect(await restoreBackup(duplicatePlan)).toEqual({ imported: 0, skipped: 1 });
    expect((await db.tasks.get('task-backup-test'))?.title).toBe('Keep this local');
  });

  it('restores document blobs and verifies their declared size', async () => {
    const bytes = new TextEncoder().encode('hello');
    const encodedBlob = btoa(String.fromCharCode(...bytes));
    const document = { id: 'doc-backup-test', name: 'note.txt', mimeType: 'text/plain', size: 5, category: 'Sonstiges', description: '', tags: [], issuedAt: null, expiresAt: null, blobBase64: encodedBlob, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' };
    const plan = await parseBackup(sampleBackup([document]));
    await restoreBackup(plan);
    expect(await (await db.documents.get('doc-backup-test'))?.blob.text()).toBe('hello');
    const invalid = { ...document, size: 6 };
    await expect(parseBackup(sampleBackup([invalid]))).rejects.toThrow('Dateigröße');
  });

  it('rejects an incorrect password, weak encryption password, and unsupported backup version', async () => {
    const encrypted = await encryptBackup(sampleBackup(), 'valid backup password');
    await expect(parseBackup(encrypted, 'wrong password')).rejects.toThrow('Entschlüsselung fehlgeschlagen');
    await expect(encryptBackup(sampleBackup(), 'short')).rejects.toThrow('mindestens 12 Zeichen');
    const unsupported = JSON.parse(sampleBackup()) as { version: number };
    unsupported.version = 99;
    await expect(parseBackup(JSON.stringify(unsupported))).rejects.toThrow('ungültig oder wird nicht unterstützt');
  });
});
