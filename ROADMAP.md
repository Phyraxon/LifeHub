# LIFEHUB Roadmap

## Phase 1 — Foundation (in progress)

- [x] React + TypeScript + Vite static app scaffold
- [x] Hash routing for GitHub Pages
- [x] Responsive desktop/mobile navigation and initial design tokens
- [x] Dark/light theme switch and first-run welcome screen
- [x] PWA manifest/service-worker build integration
- [x] LIFEHUB app icon and offline shell configuration
- [ ] Verify clean install, build, and deploy workflow
- [ ] Add localization catalog and system theme preference (language preference is stored, but UI remains German)

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
- [ ] Household maintenance reminders and shopping history/favorites view

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
- [ ] Reminder generation, device photos, and storage cleanup tooling

## Phase 9 — Backup

Implement validated versioned JSON export/import, duplicate reporting, safe restore, encrypted backup via AES-GCM/PBKDF2, and storage usage reporting.

## Phase 10 — Release quality

Add focused unit/integration and Playwright coverage, verify responsive behavior, offline app shell, subpath builds, keyboard access, and GitHub Pages deployment. Document limitations and browser storage behavior.

## Current release status

This workspace contains the Phase 1 foundation, initial settings/database work, and functional task, calendar, shopping, household, finance, document, contract, and device slices. LIFEHUB 1.0 is not complete: recurring finance, reminders, notes/search, backup, and release verification remain on the roadmap.
