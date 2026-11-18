import { useEffect, useMemo, useState } from 'react';
import { Cloud, HardDrive, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { createGoogleDriveProvider } from './googleDriveProvider';
import { createWebDavProvider } from './webDavProvider';
import { synchronize, type SyncResult } from './syncService';
import { getSessionUser } from '../account/accountStore';

type ProviderChoice = 'google-drive' | 'webdav';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

export default function SyncPage() {
  const user = getSessionUser()!;
  const providerKey = `lifehub-sync-provider:${user.id}`;
  const [providerChoice, setProviderChoice] = useState<ProviderChoice>(() => localStorage.getItem(providerKey) === 'webdav' ? 'webdav' : 'google-drive');
  const [passphrase, setPassphrase] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [oauthReady, setOauthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SyncResult | null>(null);
  const [connected, setConnected] = useState(false);

  const googleProvider = useMemo(() => googleClientId ? createGoogleDriveProvider(googleClientId) : null, []);

  useEffect(() => {
    if (!googleProvider) return;
    let active = true;
    void googleProvider.prepare().then(() => { if (active) setOauthReady(true); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Google-Anmeldung konnte nicht geladen werden.'); });
    return () => { active = false; };
  }, [googleProvider]);

  const selectProvider = (value: ProviderChoice) => {
    setProviderChoice(value); localStorage.setItem(providerKey, value); setResult(null); setError('');
  };

  const runSync = async () => {
    setError(''); setBusy(true);
    const provider = providerChoice === 'google-drive'
      ? googleProvider
      : serverUrl.trim() && username.trim() && appPassword
        ? createWebDavProvider(serverUrl, username, appPassword)
        : null;
    if (!provider) {
      setBusy(false);
      setError(providerChoice === 'google-drive' ? 'Google Drive ist noch nicht eingerichtet.' : 'Bitte Serveradresse, Benutzernamen und App-Passwort eintragen.');
      return;
    }
    try {
      await provider.authorize();
      const outcome = await synchronize(provider, passphrase, user.id);
      setResult(outcome); setConnected(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Die Synchronisierung ist fehlgeschlagen.');
    } finally { setBusy(false); }
  };

  const disconnect = () => {
    googleProvider?.disconnect();
    setConnected(false); setResult(null); setPassphrase(''); setAppPassword(''); setError('');
  };

  return <section className="sync-page">
    <div className="welcome-line"><div><p className="eyebrow">DEIN BENUTZER: {user.email}</p><h1>Synchronisierung</h1><p className="subheading">Verbinde deine eigene Cloud, um deine Daten sicher zwischen Geräten abzugleichen.</p></div></div>

    <section className="settings-card sync-security-card"><div className="sync-security-icon"><ShieldCheck size={19}/></div><div><h2>Privat verschlüsselt</h2><p>Die Daten werden auf diesem Gerät verschlüsselt, bevor sie deinen Cloud-Anbieter erreichen. Andere LIFEHUB-Nutzer können deine Daten nicht sehen.</p></div></section>

    <section className="settings-card"><div className="settings-card-heading"><h2>Cloud-Anbieter</h2><p>Jede Person verbindet ihr eigenes Konto oder ihren eigenen Server.</p></div><div className="sync-provider-options">
      <button className={`sync-provider ${providerChoice === 'google-drive' ? 'selected' : ''}`} onClick={() => selectProvider('google-drive')}><Cloud size={18}/><span><b>Google Drive</b><small>Persönlicher Google-Drive-Speicher</small></span><i/></button>
      <button className={`sync-provider ${providerChoice === 'webdav' ? 'selected' : ''}`} onClick={() => selectProvider('webdav')}><HardDrive size={18}/><span><b>WebDAV / Nextcloud</b><small>Eigene Cloud oder NAS mit WebDAV</small></span><i/></button>
    </div>
      {providerChoice === 'google-drive' ? <div className="sync-provider-fields"><p className="sync-info">LIFEHUB verwendet nur die Dateien, die es selbst anlegt. Die verschlüsselte Sicherungsdatei bleibt in deinem Google Drive.</p>{!googleClientId && <p className="sync-setup-note">Google Drive wird nach Einrichtung der LIFEHUB-OAuth-Client-ID verfügbar. In dieser Bereitstellung ist sie noch nicht hinterlegt.</p>}</div> : <div className="sync-provider-fields"><label className="sync-field">WebDAV-Adresse<input type="url" value={serverUrl} onChange={event => setServerUrl(event.target.value)} placeholder="https://cloud.example.com/remote.php/dav/files/name/" autoComplete="url"/></label><div className="sync-credentials-row"><label className="sync-field">Benutzername<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username"/></label><label className="sync-field">App-Passwort<input type="password" value={appPassword} onChange={event => setAppPassword(event.target.value)} autoComplete="off"/></label></div><p className="sync-info">Verwende ein App-Passwort deines WebDAV-Anbieters. Es wird nur im Arbeitsspeicher gehalten. Dein Server muss HTTPS und Browser-CORS für diese LIFEHUB-Seite erlauben.</p></div>}
    </section>

    <section className="settings-card"><div className="settings-card-heading"><h2>Sync-Passwort</h2><p>Dieses Passwort verschlüsselt deine Daten zusätzlich zum Cloud-Konto. Verwende es auf allen deinen Geräten.</p></div><label className="sync-field">Eigenes Sync-Passwort<input type="password" minLength={12} value={passphrase} onChange={event => setPassphrase(event.target.value)} placeholder="Mindestens 12 Zeichen" autoComplete="new-password"/></label><p className="sync-info"><LockKeyhole size={13}/> Das Passwort wird nicht gespeichert oder mit der Cloud übertragen. LIFEHUB kann es nicht wiederherstellen.</p>
      {error && <p className="form-error sync-error">{error}</p>}{result && <p className="sync-success">{result.recordsAvailable} Datensätze abgeglichen · {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.syncedAt))}</p>}
      <div className="sync-actions"><button className="button primary" onClick={() => void runSync()} disabled={busy || passphrase.length < 12 || (providerChoice === 'google-drive' && (!googleClientId || !oauthReady))}>{busy ? <><LoaderCircle className="sync-spinner" size={15}/>Synchronisiere …</> : <><RefreshCw size={15}/>Jetzt synchronisieren</>}</button>{connected && <button className="button" onClick={disconnect}><Unplug size={14}/>Verbindung lösen</button>}</div>
    </section>
    <p className="sync-footnote">Google-Zugriffstoken und WebDAV-Zugangsdaten bleiben nur während dieser Sitzung im Arbeitsspeicher. Bei Ablauf meldest du dich beim nächsten Abgleich erneut an.</p>
  </section>;
}
