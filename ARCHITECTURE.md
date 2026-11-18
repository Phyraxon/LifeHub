# LIFEHUB Architecture

## Product and runtime

LIFEHUB is a client-only React application. Vite builds static assets for GitHub Pages. Hash-based routing keeps deep links working on static hosting. User data belongs in browser storage; no server, account, analytics, or remote API is required.

## Layers

- `src/app`: application shell, routing, and global providers.
- `src/features/<feature>`: feature UI and feature-specific workflows.
- `src/components`: reusable interface components.
- `src/services`: use cases and business rules, independent of rendering.
- `src/data`: Dexie database, repositories, and migrations.
- `src/shared`: domain types, validation schemas, localization, and utilities.

The initial shell is in `src/App.tsx`; feature routes live under `src/features`. Current task, calendar, shopping, household, and finance slices use Dexie tables from route components; move persistence into application services/repositories before adding cross-module behavior. Repositories should own persistence; services should own validation and cross-module behavior. Use UUIDs and ISO timestamps for persisted records. Destructive operations involving relations must be explicit and transactional. Finance amounts are persisted as integer cents to avoid floating-point balance errors.

## Storage and privacy

Dexie/IndexedDB is the durable store. Settings and transient UI preferences may use localStorage. Document blobs are stored with metadata in IndexedDB and checked against a 20 MB limit and available browser quota before writes. JSON backup import must validate format/version, detect IDs already present, and commit changes transactionally. Encrypted exports use Web Crypto AES-GCM with a PBKDF2-derived key; this protects the export file only, not the live browser database.

## Presentation

CSS variables define light and dark palettes. System preference is the initial default; a persisted setting can override it. HashRouter is required for GitHub Pages subpaths. Translation catalogs should be the only source for user-facing strings once localization is introduced (German default, English fallback).

## PWA and deployment

`vite-plugin-pwa` emits the web manifest and service worker. The worker precaches the built app for offline shell access. `VITE_BASE_PATH` configures a repository subpath; use `/` for a custom domain/root deployment and `/<repository>/` for a project page. GitHub Actions builds and publishes `dist/`.

## Current scope

The first slice implements the responsive shell, first-run welcome, theme switch, navigation, dashboard empty state, search entry point, and quick-add chooser. Feature data workflows, full localization, persistence, and backup are subsequent roadmap work and should not be represented as complete until implemented.
