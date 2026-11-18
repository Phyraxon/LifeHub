import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, FileUp, LockKeyhole, Shield, Trash2, Upload } from 'lucide-react';
import { db } from '../../data/database';
import { createBackupJson, encryptBackup, parseBackup, restoreBackup, tableNames, type ImportPlan } from './backupService';

const saveFile = (data: string, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([data], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const prettyBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [storage, setStorage] = useState('Speicherplatz wird geprüft …');

  const refreshStorage = async () => {
    if (!navigator.storage?.estimate) { setStorage('Speicheranzeige nicht verfügbar'); return; }
    const estimate = await navigator.storage.estimate();
    if (estimate.usage !== undefined && estimate.quota !== undefined) setStorage(`${prettyBytes(estimate.usage)} von ${prettyBytes(estimate.quota)} belegt`);
  };
  useEffect(() => { void refreshStorage(); }, []);

  const exportPlain = async () => {
    setBusy(true); setError(''); setStatus('');
    try { saveFile(await createBackupJson(), `lifehub-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); setStatus('Sicherung exportiert.'); }
    catch { setError('Die Sicherung konnte nicht erstellt werden. Prüfe den verfügbaren Browser-Speicher.'); }
    finally { setBusy(false); }
  };
  const exportEncrypted = async () => {
    setBusy(true); setError(''); setStatus('');
    try { const content = await encryptBackup(await createBackupJson(), password); saveFile(content, `lifehub-backup-${new Date().toISOString().slice(0, 10)}.lifehub`, 'application/json'); setStatus('Verschlüsselte Sicherung exportiert. Bewahre das Passwort sicher auf.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Die verschlüsselte Sicherung konnte nicht erstellt werden.'); }
    finally { setBusy(false); }
  };
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => { setFile(event.target.files?.[0] ?? null); setPlan(null); setError(''); setStatus(''); };
  const inspectFile = async () => {
    if (!file) { setError('Wähle zuerst eine Sicherungsdatei aus.'); return; }
    setBusy(true); setError(''); setStatus('');
    try { const parsed = await parseBackup(await file.text(), password); setPlan(parsed); }
    catch (cause) { setPlan(null); setError(cause instanceof Error ? cause.message : 'Die Sicherung konnte nicht geprüft werden.'); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!plan) return;
    setBusy(true); setError(''); setStatus('');
    try { const result = await restoreBackup(plan); setStatus(`${result.imported} Datensätze wiederhergestellt, ${result.skipped} Duplikate übersprungen. Vorhandene Einträge wurden nicht überschrieben.`); setPlan(null); setFile(null); if (fileRef.current) fileRef.current.value = ''; await refreshStorage(); }
    catch { setError('Wiederherstellung fehlgeschlagen. Die Datenbank wurde nicht teilweise verändert.'); }
    finally { setBusy(false); }
  };
  const eraseData = async () => {
    if (deletePhrase !== 'LIFEHUB') return;
    setBusy(true); setError('');
    try {
      const tables = tableNames.map(name => db.table(name));
      await db.transaction('rw', tables, async () => { for (const name of tableNames) await db.table(name).clear(); });
      localStorage.removeItem('lifehub-welcome'); localStorage.removeItem('lifehub-theme'); localStorage.removeItem('lifehub-search-history');
      setPlan(null); setFile(null); setPassword(''); setDeletePhrase(''); setStatus('Alle lokalen LIFEHUB-Daten wurden gelöscht.'); await refreshStorage();
    } catch { setError('Daten konnten nicht vollständig gelöscht werden.'); }
    finally { setBusy(false); }
  };

  const duplicates = plan ? tableNames.reduce((sum, name) => sum + plan.duplicates[name], 0) : 0;
  return <section className="backup-page">
    <div className="welcome-line"><div><p className="eyebrow">DEINE DATEN BLEIBEN DEINE</p><h1>Datenschutz & Backup</h1><p className="subheading">Sichere deine Daten, wann immer du möchtest.</p></div></div>
    <div className="backup-privacy-note"><span><Shield size={17}/></span><div><b>Lokale Speicherung</b><p>Deine Daten liegen in diesem Browser. Ein verschlüsseltes Backup schützt die exportierte Datei; die laufende IndexedDB-Datenbank ist dadurch nicht verschlüsselt.</p></div></div>
    <section className="backup-card"><div className="backup-heading"><span className="backup-icon"><Download size={17}/></span><div><h2>Sicherung exportieren</h2><p>Enthält deine Einträge, Einstellungen und gespeicherten Dokumente.</p></div></div><div className="backup-export-actions"><button className="button" onClick={() => void exportPlain()} disabled={busy}><Download size={14}/>JSON exportieren</button><div className="encrypt-export"><label><span>Backup-Passwort</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 12 Zeichen"/></label><button className="button primary" onClick={() => void exportEncrypted()} disabled={busy || password.length < 12}><LockKeyhole size={14}/>Verschlüsselt exportieren</button></div></div></section>
    <section className="backup-card"><div className="backup-heading"><span className="backup-icon blue"><Upload size={17}/></span><div><h2>Sicherung wiederherstellen</h2><p>Import prüft Format und Version. Doppelte IDs werden übersprungen, bestehende Einträge bleiben unverändert.</p></div></div><div className="backup-import-row"><input ref={fileRef} type="file" accept=".json,.lifehub,application/json" onChange={chooseFile}/><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort, falls verschlüsselt"/><button className="button" onClick={() => void inspectFile()} disabled={busy || !file}><FileUp size={14}/>Datei prüfen</button></div>{plan && <div className="backup-plan"><b>Sicherung enthält {plan.total} Datensätze.</b><span>{duplicates} Duplikate werden übersprungen; neue Einträge können importiert werden.</span><button className="button primary" onClick={() => void restore()} disabled={busy}>Wiederherstellung starten</button></div>}</section>
    <section className="backup-card storage-card"><div className="backup-heading"><span className="backup-icon green"><Shield size={17}/></span><div><h2>Browser-Speicher</h2><p>{storage}</p></div></div><button className="button" onClick={() => void refreshStorage()}>Speicher aktualisieren</button></section>
    <section className="backup-card danger-card"><div className="backup-heading"><span className="backup-icon red"><Trash2 size={17}/></span><div><h2>Alle LIFEHUB-Daten löschen</h2><p>Entfernt alle lokalen Einträge, Dokumente und Einstellungen aus diesem Browser.</p></div></div><div className="delete-confirm-row"><label>Zum Bestätigen LIFEHUB eingeben<input value={deletePhrase} onChange={e => setDeletePhrase(e.target.value)} placeholder="LIFEHUB"/></label><button className="button danger-button" onClick={() => void eraseData()} disabled={busy || deletePhrase !== 'LIFEHUB'}><Trash2 size={14}/>Daten endgültig löschen</button></div></section>
    {(status || error) && <div className={error ? 'backup-message error' : 'backup-message'}>{error || status}</div>}
  </section>;
}
