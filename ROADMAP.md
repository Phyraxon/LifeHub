# LIFEHUB Roadmap

## Phase 1 — Foundation (in progress)

- [x] React + TypeScript + Vite static app scaffold
- [x] Hash routing for GitHub Pages
- [x] Responsive desktop/mobile navigation and initial design tokens
- [x] Dark/light theme switch and first-run welcome screen
- [x] PWA manifest/service-worker build integration
- [x] LIFEHUB app icon and offline shell configuration
- [ ] Verify clean install and Pages deployment workflow
- [x] Follow the operating system theme when the appearance is set to System
- [ ] Add a localization catalog and apply the stored English preference across the interface

## Phase 2 — Dashboard and settings (in progress)

- [x] Persist theme, preferred language, and currency in local settings
- [ ] Apply locale across the UI, add system theme support, and make dashboard widgets configurable
- [ ] Expand onboarding and profile settings

## Phase 3 — Data layer

The first Dexie schema now defines settings and the requested module stores. Next add shared UUID/timestamp types, Zod schemas, repository services, real migration steps, and transaction-safe deletion. Establish Vitest coverage for persistence and migration behavior.

## Phase 4 — Kalender und Aufgaben (in progress)

- [x] Tasks stored in IndexedDB with create, edit, complete, delete, and search flows
- [x] Open, today, week, overdue, and completed task filters
- [ ] Categories, subtasks, recurrence, calendar links, and task tests
- [x] Calendar event create, edit, delete, all-day support, category/color, and notes
- [x] Day, week, month, and agenda views
- [x] Basic ICS import/export with date/text conversion unit tests
- [ ] Recurring events, reminders, task links, duplicate-aware ICS import, and run verification

## Phase 5 — Haushalt und Einkauf (in progress)

- [x] Multiple shopping lists persisted locally
- [x] Products with quantity, unit, category, price, completion, and favorite state
- [x] Accurate line-rounded totals and remaining open subtotal
- [x] Household rooms and chores with due dates, notes, one-time/daily/weekly/monthly recurrence
- [x] Completing recurring chores advances their next due date, including month-end handling
- [x] Household task reminders appear in the reminder center; shopping history/favorites view remains open

## Phases 6–8 — Daily life modules

Deliver finance, documents/contracts/devices, then notes, unified search, and reminders. Each module must have complete create/read/update/delete flows and useful empty states before being linked as active.

### Phase 6 — Finances (in progress)

- [x] Record income and expenses with date and category
- [x] Monthly balance and category totals using integer cents
- [x] Monthly budget with remaining/over-budget calculation
- [x] Savings goals with contributions
- [ ] Recurring transactions, dedicated budget categories, month comparison, and chart coverage

### Phase 7 — Documents, contracts, and devices (in progress)

- [x] Local document upload, metadata, category/tag search, preview, download, and delete
- [x] 20 MB file limit, accepted-format checks, and browser quota check before writes
- [x] Contract/subscription costs, billing cycles, renewal dates, and notice date calculations
- [x] Device purchase/serial/warranty records with calculated warranty end and document links
- [x] Reminder generation for contract notice dates, device warranties, and expiring documents
- [ ] Device photos and storage cleanup tooling

### Phase 8 — Notes, search, and reminders (in progress)

- [x] Notes with categories, tags, favorites, archive, search, and editing
- [x] Global keyboard search across tasks, events, documents, contracts, devices, notes, and shopping items
- [x] Search history stored locally; document blobs scanned without retaining the full file list in memory
- [x] Reminder center for due tasks, calendar events, household chores, contracts, warranties, and expiring documents
- [x] Reminder generation unit tests
- [ ] Checklists, cross-module links, and browser notification settings

## Phase 9 — Backup (in progress)

- [x] Versioned JSON export and Zod-validated import
- [x] AES-GCM encrypted export with PBKDF2-SHA-256, random salt/IV, and 600,000 iterations
- [x] Duplicate preview and transactional restore that skips existing IDs without overwriting
- [x] Document blob export/import and size verification
- [x] Browser storage estimate and explicit full local-data deletion
- [ ] Cross-version migrations, larger backup streaming, and browser-level recovery tests

## Phase 10 — Release quality

Add focused unit/integration and Playwright coverage, verify responsive behavior, offline app shell, subpath builds, keyboard access, and GitHub Pages deployment. Document limitations and browser storage behavior.

## Current release status

This workspace contains the Phase 1 foundation, initial settings/database work, and functional task, calendar, shopping, household, finance, document, contract, device, notes, global-search, reminders, and initial backup slices. LIFEHUB 1.0 is not complete: additional backup compatibility and release verification remain on the roadmap.
