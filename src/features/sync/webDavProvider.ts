import type { SyncProvider, SyncSnapshot } from './SyncProvider';

const prefix = 'lifehub-sync-';

function encodeCredentials(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function createWebDavProvider(serverUrl: string, username: string, password: string): SyncProvider {
  const base = `${serverUrl.trim().replace(/\/+$/, '')}/`;
  let auth = `Basic ${encodeCredentials(username, password)}`;
  let folderUrl = `${base}LIFEHUB-Sync/`;

  const request = async (url: string, method: string, body?: BodyInit, headers: Record<string, string> = {}) => {
    let response: Response;
    try {
      response = await fetch(url, { method, body, headers: { Authorization: auth, ...headers } });
    } catch {
      throw new Error('Der WebDAV-Server ist nicht erreichbar oder erlaubt keine Browser-Verbindung (CORS). Verwende eine HTTPS-Adresse und aktiviere CORS für LIFEHUB.');
    }
    if (!response.ok && response.status !== 207 && !(method === 'MKCOL' && response.status === 405)) throw new Error(`Der WebDAV-Server meldet Fehler ${response.status}.`);
    return response;
  };

  return {
    id: 'webdav',
    name: 'WebDAV / Nextcloud',
    async prepare() {},
    async authorize() {
      if (!/^https:\/\//i.test(base)) throw new Error('WebDAV-Synchronisierung funktioniert aus Sicherheitsgründen nur über HTTPS.');
      const response = await request(folderUrl, 'MKCOL');
      if (![201, 405].includes(response.status)) throw new Error(`Der LIFEHUB-Sync-Ordner konnte nicht geprüft werden (${response.status}).`);
    },
    async listSnapshots(): Promise<SyncSnapshot[]> {
      const response = await request(folderUrl, 'PROPFIND', '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' });
      const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
      if (xml.querySelector('parsererror')) throw new Error('Der WebDAV-Server hat eine ungültige Antwort geliefert.');
      return [...xml.getElementsByTagNameNS('DAV:', 'response')].map(item => item.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent || '')
        .map(href => decodeURIComponent(href.split('/').filter(Boolean).at(-1) || ''))
        .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
        .map(name => ({ id: name, deviceId: name.slice(prefix.length, -5), name }));
    },
    async readSnapshot(id: string): Promise<string> {
      return await (await request(new URL(encodeURIComponent(id), folderUrl).toString(), 'GET')).text();
    },
    async writeSnapshot(deviceId: string, encryptedPayload: string): Promise<void> {
      await request(new URL(`${prefix}${encodeURIComponent(deviceId)}.json`, folderUrl).toString(), 'PUT', encryptedPayload, { 'Content-Type': 'application/json' });
    },
    disconnect() { auth = ''; },
  };
}
