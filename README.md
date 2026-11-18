# LIFEHUB

**Your life. One place.** A private, local-first personal life management platform.

> Current status: local-first workflows are available for tasks, calendar, shopping, household, finance, documents, contracts, devices, notes, global search, reminders, and versioned JSON/encrypted backup. LIFEHUB 1.0 still needs release verification and additional compatibility work.

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
