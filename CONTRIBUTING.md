# Contributing to EzGym

Thanks for considering a contribution. EzGym is a 100% offline workout PWA (Angular 22 standalone + zoneless + Signals, Ionic 9, Dexie).

## Prerequisites

- Node 20+ with `corepack enable` (pnpm version is pinned in `packageManager`, currently pnpm 10.34.5)
- No backend, no secrets, no network required for tests

## Setup

```bash
pnpm install
pnpm start        # dev server without service worker
```

## Quality gate (required before every PR)

```bash
pnpm lint && pnpm test && pnpm build
```

- `pnpm lint` includes the layer-boundary rules (`eslint.config.js` with `no-restricted-imports`). A boundary violation fails the lint.
- `pnpm test` runs Vitest specs co-located as `*.spec.ts` (fake-indexeddb, no external DB).
- `pnpm build` produces production `www/` with the service worker. Pre-existing SCSS budget warnings are known; new ones are a regression.

Run `pnpm format` before committing (`src/**/*.{ts,html}`).

## Architecture rules (summary)

`src/app` layers with aliases `@core/*`, `@domain/*`, `@features/*`, `@shared/*`, `@layouts/*`:

```
core (infra singleton) -> domain (entities + repositories) -> shared -> features -> layouts
```

- `domain`/`shared`/`layouts` never import `@features`; a feature never imports another feature.
- Only `*.repository.ts` (plus `core/db`, specs and `src/testing`) import the Dexie singleton (`@core/db/app-db`).
- Multi-aggregate writes go through `DatabaseService.write()`; pages never touch repository/DB directly — they use the feature's facade/store/query.
- Repositories/facades/queries return Promises; state is patched **after** persisting.
- Data loading in `ionViewWillEnter()`; standalone components with explicit `imports: []`; new control flow (`@if`/`@for`, never `*ngIf`/`*ngFor`/`| async`); zoneless (no `ChangeDetectionStrategy`); `inject()` in field declarations; functional `input()`/`output()`.
- SCSS co-located, BEM with nesting (`.block { &__element { &--modifier {} } }`).
- i18n is mandatory for new copy: `TranslatePipe` in templates, `translate.instant()` in alerts/toasts/modals; new keys go in **both** `src/assets/i18n/pt.json` **and** `en.json` (`NAMESPACE.KEY`).

See `AGENTS.md` and `README.md` for the full structure, routes, persistence and PWA notes.

## Dexie schema changes

Schema changes require a new `version(N)` in `core/db/app-db.ts` with a Dexie migration. Never edit an existing version.

## PWA validation

The service worker only registers in production builds (`!isDevMode()`). To validate PWA flows, run `pnpm build` and serve `www/` over HTTPS.

## Commit scope

Keep commits small and scoped (`feat(workouts): ...`, `fix(session): ...`, `refactor(...)`, `chore(...)`). Do not commit secrets (the project has none — keep it that way) and do not add telemetry or silent network calls: user data never leaves the device.
