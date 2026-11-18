import type { SyncProvider, SyncSnapshot } from './SyncProvider';

const driveApi = 'https://www.googleapis.com/drive/v3';
const uploadApi = 'https://www.googleapis.com/upload/drive/v3';
const scope = 'openid email profile https://www.googleapis.com/auth/drive.file';
const folderMimeType = 'application/vnd.google-apps.folder';
const snapshotMimeType = 'application/vnd.lifehub.encrypted-sync+json';
const snapshotPrefix = 'lifehub-sync-';

type TokenResponse = { access_token?: string; error?: string; error_description?: string; expires_in?: number };
type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };
type DriveFile = { id: string; name: string; mimeType?: string; appProperties?: Record<string, string> };

declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient: (options: { client_id: string; scope: string; callback: (response: TokenResponse) => void; error_callback?: (error: { type?: string; message?: string }) => void }) => TokenClient; revoke: (token: string, callback?: () => void) => void } } };
  }
}

let libraryPromise: Promise<void> | undefined;
let accessToken: string | undefined;
let tokenExpiresAt = 0;
export function signOutGoogle(): void {
  if (accessToken && window.google?.accounts.oauth2) window.google.accounts.oauth2.revoke(accessToken);
  accessToken = undefined; tokenExpiresAt = 0;
}

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => window.google?.accounts.oauth2 ? resolve() : reject(new Error('Google-Anmeldung ist nicht verfügbar.'));
    script.onerror = () => reject(new Error('Google-Anmeldung konnte nicht geladen werden.'));
    document.head.appendChild(script);
  });
  return libraryPromise;
}

async function uploadSnapshot(token: string, fileId: string, payload: string): Promise<void> {
  const payloadSize = new TextEncoder().encode(payload).byteLength;
  const start = await fetch(`${uploadApi}/files/${encodeURIComponent(fileId)}?uploadType=resumable`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'X-Upload-Content-Type': 'application/json', 'X-Upload-Content-Length': String(payloadSize) },
  });
  if (!start.ok) throw new Error(`Google Drive konnte den Upload nicht vorbereiten (${start.status}).`);
  const uploadUrl = start.headers.get('Location');
  if (!uploadUrl) throw new Error('Google Drive hat keine Upload-Adresse zurückgegeben.');
  const uploaded = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload });
  if (!uploaded.ok) throw new Error(`Die LIFEHUB-Sicherung konnte nicht in Google Drive gespeichert werden (${uploaded.status}).`);
}

async function requestToken(clientId: string): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) return accessToken;
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: response => {
        if (response.error || !response.access_token) { reject(new Error(response.error_description || response.error || 'Google-Anmeldung wurde abgebrochen.')); return; }
        accessToken = response.access_token;
        tokenExpiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
        resolve(accessToken);
      },
      error_callback: error => reject(new Error(error.message || 'Google-Anmeldung konnte nicht abgeschlossen werden.')),
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

export interface GoogleIdentity { id: string; email: string; name: string; }
export async function signInWithGoogle(clientId: string): Promise<GoogleIdentity> {
  const bearer = await requestToken(clientId);
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${bearer}` } });
  if (!response.ok) throw new Error('Google konnte dein Konto nicht bestätigen. Bitte melde dich erneut an.');
  const profile = await response.json() as { sub?: string; email?: string; name?: string; email_verified?: boolean };
  if (!profile.sub || !profile.email || profile.email_verified !== true) throw new Error('Google hat keine bestätigte E-Mail-Adresse zurückgegeben.');
  return { id: profile.sub, email: profile.email, name: profile.name || profile.email.split('@')[0] };
}

async function verifyGoogleSubject(bearer: string, expectedSubject: string): Promise<void> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${bearer}` } });
  if (!response.ok) throw new Error('Google-Anmeldung abgelaufen. Bitte verbinde dein Google-Konto erneut.');
  const profile = await response.json() as { sub?: string };
  if (profile.sub !== expectedSubject) throw new Error('Das ausgewählte Google-Konto stimmt nicht mit deinem LIFEHUB-Benutzer überein.');
}

async function driveRequest<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  if (!response.ok) {
    let message = `Google Drive meldet Fehler ${response.status}.`;
    try { const body = await response.json() as { error?: { message?: string } }; message = body.error?.message || message; } catch { /* Keep the status-based message. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function createGoogleDriveProvider(clientId: string, expectedSubject?: string): SyncProvider {
  let folderId: string | undefined;
  const token = () => requestToken(clientId);

  const findFolder = async (bearer: string) => {
    if (folderId) return folderId;
    const query = encodeURIComponent(`name='LIFEHUB Sync' and mimeType='${folderMimeType}' and trashed=false`);
    const found = await driveRequest<{ files: DriveFile[] }>(bearer, `${driveApi}/files?q=${query}&fields=files(id,name)&pageSize=100`);
    folderId = found.files[0]?.id;
    if (!folderId) {
      const created = await driveRequest<DriveFile>(bearer, `${driveApi}/files?fields=id,name`, { method: 'POST', body: JSON.stringify({ name: 'LIFEHUB Sync', mimeType: folderMimeType }) });
      folderId = created.id;
    }
    return folderId;
  };

  return {
    id: 'google-drive',
    name: 'Google Drive',
    prepare: () => loadGoogleIdentity(),
    authorize: async () => { const bearer = await requestToken(clientId); if (expectedSubject) await verifyGoogleSubject(bearer, expectedSubject); },
    async listSnapshots(profileId: string): Promise<SyncSnapshot[]> {
      const bearer = await token();
      if (expectedSubject) await verifyGoogleSubject(bearer, expectedSubject);
      const parent = await findFolder(bearer);
      const query = encodeURIComponent(`'${parent}' in parents and trashed=false and name contains '${snapshotPrefix}'`);
      let pageToken = '';
      const files: DriveFile[] = [];
      do {
        const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const result = await driveRequest<{ files: DriveFile[]; nextPageToken?: string }>(bearer, `${driveApi}/files?q=${query}&fields=nextPageToken,files(id,name,appProperties)&pageSize=100${page}`);
        files.push(...result.files);
        pageToken = result.nextPageToken ?? '';
      } while (pageToken);
      return files.filter(file => file.appProperties?.lifehubSync === 'v1' && file.appProperties.profileId === profileId && file.appProperties.deviceId)
        .map(file => ({ id: file.id, deviceId: file.appProperties!.deviceId, name: file.name }));
    },
    async readSnapshot(id: string): Promise<string> {
      const bearer = await token();
      if (expectedSubject) await verifyGoogleSubject(bearer, expectedSubject);
      const response = await fetch(`${driveApi}/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: `Bearer ${bearer}` } });
      if (!response.ok) throw new Error(`Die LIFEHUB-Sicherung in Google Drive konnte nicht geladen werden (${response.status}).`);
      return await response.text();
    },
    async writeSnapshot(profileId: string, deviceId: string, encryptedPayload: string): Promise<void> {
      const bearer = await token();
      if (expectedSubject) await verifyGoogleSubject(bearer, expectedSubject);
      const parent = await findFolder(bearer);
      const name = `${snapshotPrefix}${profileId}-${deviceId}.json`;
      const query = encodeURIComponent(`'${parent}' in parents and name='${name}' and trashed=false`);
      const found = await driveRequest<{ files: DriveFile[] }>(bearer, `${driveApi}/files?q=${query}&fields=files(id,name)&pageSize=10`);
      let id = found.files[0]?.id;
      if (!id) {
        const created = await driveRequest<DriveFile>(bearer, `${driveApi}/files?fields=id,name`, { method: 'POST', body: JSON.stringify({ name, mimeType: snapshotMimeType, parents: [parent], appProperties: { lifehubSync: 'v1', profileId, deviceId } }) });
        id = created.id;
      }
      await uploadSnapshot(bearer, id, encryptedPayload);
    },
    disconnect() {
      signOutGoogle(); folderId = undefined;
    },
  };
}
