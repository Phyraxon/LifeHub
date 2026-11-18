import { clearActiveProfileDatabase, migrateLegacyDatabaseToProfile, setActiveProfileDatabase } from '../../data/database';

export interface LifehubUser { id: string; email: string; name: string; }
interface LocalAccount extends LifehubUser { salt: string; verifier: string; }
const accountsKey = 'lifehub-local-accounts';
const sessionKey = 'lifehub-active-user';
const bytesToHex = (bytes: Uint8Array) => [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
async function digest(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
async function derive(password: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/.{2}/g) ?? [], part => parseInt(part, 16)), iterations: 210000, hash: 'SHA-256' }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}
function accounts(): LocalAccount[] { try { return JSON.parse(localStorage.getItem(accountsKey) ?? '[]') as LocalAccount[]; } catch { return []; } }
export function getSessionUser(): LifehubUser | null {
  try { const user = JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null') as LifehubUser | null; if (user?.id) setActiveProfileDatabase(user.id); return user; } catch { return null; }
}
export async function signInOrCreate(emailInput: string, nameInput: string, password: string): Promise<LifehubUser> {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  if (password.length < 10) throw new Error('Das LIFEHUB-Passwort muss mindestens 10 Zeichen lang sein.');
  const id = (await digest(email)).slice(0, 32);
  const list = accounts();
  let account = list.find(item => item.id === id);
  if (account) {
    if (await derive(password, account.salt) !== account.verifier) throw new Error('E-Mail-Adresse oder Passwort stimmt nicht.');
    if (nameInput.trim() && account.name !== nameInput.trim()) { account = { ...account, name: nameInput.trim() }; localStorage.setItem(accountsKey, JSON.stringify(list.map(item => item.id === id ? account : item))); }
  } else {
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    account = { id, email, name: nameInput.trim() || email.split('@')[0], salt, verifier: await derive(password, salt) };
    localStorage.setItem(accountsKey, JSON.stringify([...list, account]));
  }
  await migrateLegacyDatabaseToProfile(id);
  const user = { id: account.id, email: account.email, name: account.name };
  setActiveProfileDatabase(id); sessionStorage.setItem(sessionKey, JSON.stringify(user));
  return user;
}
export function signOut(): void { sessionStorage.removeItem(sessionKey); clearActiveProfileDatabase(); }
