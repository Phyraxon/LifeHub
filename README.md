# LIFEHUB

**Your life. One place.** A private, local-first personal life management platform.

> Current status: local-first workflows are available for tasks, calendar, shopping, household, finance, documents, contracts, devices, notes, global search, reminders, and versioned JSON/encrypted backup. Optional encrypted device sync is implemented for Google Drive and WebDAV/Nextcloud; Google Drive needs the project's OAuth client ID before it can be enabled on the hosted build.

## Run locally

Requires a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
npm run test
npm run preview
```

## GitHub Pages

Set `VITE_BASE_PATH` to the project path (for example `/<repository>/`) when building a project site; use `/` for a root/custom-domain site. The workflow in `.github/workflows/deploy.yml` builds and publishes the static `dist` directory. Hash routing supports reloading application routes on Pages.

## Privacy and storage

LIFEHUB has no central application backend. Records stay in the browser's IndexedDB unless the user explicitly starts sync. Optional sync encrypts data on the device before sending it to the selected provider. See [the sync and provider setup](./SYNC.md) and the in-app [privacy notice](https://phyraxon.github.io/LifeHub/#/datenschutz).

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Roadmap](./ROADMAP.md)
- [Sync setup](./SYNC.md)

## License

No license has been selected yet.
