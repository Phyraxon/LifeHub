# Cross-device sync

LIFEHUB keeps its working copy in IndexedDB on each device. Sync is optional and sends an encrypted snapshot only after the user chooses a provider and presses **Jetzt synchronisieren**.

## Privacy model

- Records and document contents are encrypted in the browser with AES-GCM before upload. The sync passphrase is expanded with PBKDF2-SHA-256 (600,000 iterations); it is never saved or sent to the provider.
- Use the same sync passphrase on every device. LIFEHUB cannot recover it. Google access tokens and WebDAV passwords remain in memory for the current page session.
- Each device maintains its own encrypted snapshot. On sync, snapshots are merged by record `updatedAt`; deletion tombstones propagate removals. For simultaneous edits to the same record, the later timestamp wins.
- Cloud storage providers can see file names, sizes, and update times, but not encrypted record contents. Keep a separate encrypted backup as recovery protection.
- The browser app remains available on phones as a PWA. Open the Pages URL in Safari/Chrome and use the browser's “Add to Home Screen” or “Install app” command.

## Google Drive setup (maintainer)

Google Drive sync uses the narrow `drive.file` scope and stores files in a `LIFEHUB Sync` folder in each user's Drive. It can access the files LIFEHUB creates, not the user's whole Drive.

1. Create a Google Cloud project and enable the Google Drive API.
2. Configure the OAuth consent screen and create a **Web application** OAuth client ID.
3. Add authorized JavaScript origins `https://phyraxon.github.io` and, for local development, `http://localhost:5173`.
4. Store the OAuth client ID as the GitHub Actions repository variable `VITE_GOOGLE_CLIENT_ID`. The client ID is public; do not use a client secret in the browser.
5. For local builds, set `VITE_GOOGLE_CLIENT_ID` in `.env.local` using `.env.example` as a template.
6. Publish/verify the OAuth app in Google Cloud before inviting general users. `drive.file` is a non-sensitive per-file scope, but public OAuth apps still have Google's verification requirements.

## WebDAV / Nextcloud setup (user)

Select **WebDAV / Nextcloud** in Synchronization settings. Enter the HTTPS WebDAV URL, username, and an app password. The server must allow browser CORS requests from the LIFEHUB Pages origin and permit `PROPFIND`, `MKCOL`, and `PUT`. Credentials are kept in memory only; re-enter the app password for a later session.

## Installing on a phone

Visit `https://phyraxon.github.io/LifeHub/` on the phone. On Android choose **Install app** or **Add to Home screen** in the browser menu. On iPhone/iPad in Safari choose **Share → Add to Home Screen**. Sign into the same cloud account and enter the same sync passphrase on each device.