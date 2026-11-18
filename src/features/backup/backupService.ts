import { z } from 'zod';
import { db, type StoredDocument } from '../../data/database';

export const backupVersion = 1;
export const tableNames = [
  'settings', 'tasks', 'events', 'householdTasks', 'rooms', 'transactions', 'budgets', 'savingsGoals',
  'shoppingLists', 'shoppingItems', 'documents', 'contracts', 'subscriptions', 'devices', 'notes',
  'categories', 'tags', 'reminders', 'attachments', 'syncTombstones',
] as const;
export type BackupTableName = typeof tableNames[number];

const rowSchema = z.object({ id: z.string().min(1), createdAt: z.string().min(1), updatedAt: z.string().min(1) }).passthrough();
const payloadSchema = z.object({
  format: z.literal('LIFEHUB_BACKUP'),
  version: z.literal(backupVersion),
  exportedAt: z.string().datetime(),
  tables: z.record(z.string(), z.array(rowSchema)),
});
const encryptedSchema = z.object({
  format: z.literal('LIFEHUB_ENCRYPTED_BACKUP'), version: z.literal(1), kdf: z.literal('PBKDF2-SHA-256'),
  iterations: z.number().int().min(100_000).max(2_000_000), salt: z.string(), iv: z.string(), ciphertext: z.string(),
});

export type ImportPlan = { rows: Record<BackupTableName, Record<string, unknown>[]>; duplicates: Record<BackupTableName, number>; total: number };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function createBackupJson(): Promise<string> {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const name of tableNames) {
    const rows = await db.table(name).toArray() as Record<string, unknown>[];
    if (name === 'documents') {
      tables[name] = await Promise.all(rows.map(async row => {
        const document = row as unknown as StoredDocument;
        const bytes = new Uint8Array(await document.blob.arrayBuffer());
        const { blob: _blob, ...metadata } = document;
        return { ...metadata, blobBase64: bytesToBase64(bytes) };
      }));
    } else tables[name] = rows;
  }
  return JSON.stringify({ format: 'LIFEHUB_BACKUP', version: backupVersion, exportedAt: new Date().toISOString(), tables }, null, 2);
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptBackup(plaintext: string, password: string): Promise<string> {
  if (password.length < 12) throw new Error('Das Backup-Passwort muss mindestens 12 Zeichen lang sein.');
  const iterations = 600_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return JSON.stringify({ format: 'LIFEHUB_ENCRYPTED_BACKUP', version: 1, kdf: 'PBKDF2-SHA-256', iterations, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) });
}

async function decryptBackup(container: unknown, password: string): Promise<string> {
  const parsed = encryptedSchema.safeParse(container);
  if (!parsed.success) throw new Error('Die verschlüsselte Sicherung hat ein ungültiges Format.');
  try {
    const key = await deriveKey(password, base64ToBytes(parsed.data.salt), parsed.data.iterations);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(parsed.data.iv) }, key, base64ToBytes(parsed.data.ciphertext));
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error('Entschlüsselung fehlgeschlagen. Prüfe das Passwort und die Datei.'); }
}

export async function parseBackup(text: string, password = ''): Promise<ImportPlan> {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Die Datei enthält kein gültiges JSON.'); }
  if (typeof parsed === 'object' && parsed !== null && 'format' in parsed && parsed.format === 'LIFEHUB_ENCRYPTED_BACKUP') {
    if (!password) throw new Error('Gib das Backup-Passwort ein.');
    parsed = JSON.parse(await decryptBackup(parsed, password));
  }
  const validated = payloadSchema.safeParse(parsed);
  if (!validated.success) throw new Error('Backup-Version oder Datenstruktur ist ungültig oder wird nicht unterstützt.');
  const source = validated.data.tables;
  if (tableNames.some(name => name !== 'syncTombstones' && !Object.hasOwn(source, name)) || Object.keys(source).some(name => !tableNames.includes(name as BackupTableName))) {
    throw new Error('Das Backup enthält unvollständige oder unbekannte Datenbereiche.');
  }
  const rows = {} as Record<BackupTableName, Record<string, unknown>[]>;
  for (const name of tableNames) {
    const data = source[name] ?? [];
    const ids = new Set<string>();
    for (const row of data) {
      if (ids.has(row.id)) throw new Error(`Das Backup enthält doppelte IDs im Bereich „${name}“.`);
      ids.add(row.id);
    }
    if (name === 'documents') rows[name] = data.map(row => {
      const encoded = row.blobBase64;
      if (typeof encoded !== 'string' || typeof row.size !== 'number' || row.size > 20 * 1024 * 1024) throw new Error('Ein Dokument im Backup ist ungültig oder überschreitet 20 MB.');
      const bytes = base64ToBytes(encoded);
      if (bytes.byteLength !== row.size) throw new Error('Die Dateigröße eines Dokuments stimmt nicht mit dem Backup überein.');
      const { blobBase64: _blobBase64, ...metadata } = row;
      return { ...metadata, blob: new Blob([bytes], { type: typeof row.mimeType === 'string' ? row.mimeType : '' }) };
    });
    else rows[name] = data as Record<string, unknown>[];
  }
  const duplicates = {} as Record<BackupTableName, number>;
  let total = 0;
  for (const name of tableNames) {
    total += rows[name].length;
    const existing = await db.table(name).bulkGet(rows[name].map(row => String(row.id)));
    duplicates[name] = existing.filter(Boolean).length;
  }
  return { rows, duplicates, total };
}

export async function restoreBackup(plan: ImportPlan): Promise<{ imported: number; skipped: number }> {
  let imported = 0; let skipped = 0;
  const tables = tableNames.map(name => db.table(name));
  await db.transaction('rw', tables, async () => {
    for (const name of tableNames) {
      const table = db.table(name);
      const rows = plan.rows[name];
      const existing = await table.bulkGet(rows.map(row => String(row.id)));
      const toAdd = rows.filter((_row, index) => !existing[index]);
      skipped += rows.length - toAdd.length;
      if (toAdd.length) {
        await table.bulkAdd(toAdd as never[]);
        imported += toAdd.length;
      }
    }
  });
  return { imported, skipped };
}

export async function encryptBackupFile(password: string): Promise<string> {
  return encryptBackup(await createBackupJson(), password);
}
