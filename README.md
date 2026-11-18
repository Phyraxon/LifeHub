# LIFEHUB

**Your life. One place.** A private, local-first personal life management platform.

> Current status: early foundation. Local task/calendar/shopping/household/finance/document/contract/device workflows, notes, search, and initial JSON/encrypted backup flows are present; reminders and extended backup compatibility remain in progress.

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

The product is designed to run without a backend. Dexie/IndexedDB is configured for settings and future module records. Theme, preferred language, and currency are stored locally; the visible interface is currently German only. The first-run welcome dismissal uses local browser storage. The dashboard contains no sample personal data. Clearing browser storage removes preferences and, once added, local records. Encrypted backup will protect exported backup files, not automatically encrypt the live database.

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Roadmap](./ROADMAP.md)

## License

No license has been selected yet.
