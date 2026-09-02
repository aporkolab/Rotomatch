# Security Audit Report

**Generated:** 2026-09-02
**Project:** Rotomatch v1.0.0
**Audit Level:** Moderate and above

## Summary

`npm audit` before this pass: **74 vulnerabilities** (3 critical, 48 high, 20 moderate, 3 low).
After the lockfile refresh: **34** (1 critical, 24 high, 7 moderate, 2 low).
After the Angular 19 → 21 upgrade: **7** (0 critical, 3 high, 4 moderate).
After the application-builder migration: **0**.

`npm audit` is clean. GitHub started this at 115 open Dependabot alerts.

## What was done

1. **Regenerated `package-lock.json`.** It was out of sync with `package.json` (missing the
   platform-specific `@rollup/rollup-*` optional packages), so `npm ci` failed outright and
   `npm i` silently pinned stale transitive versions. All transitive dependencies now resolve
   to their patched releases.
2. **Bumped Angular to the end of the v19 line:** framework packages `19.2.14 → 19.2.25`,
   CLI and `@angular-devkit/build-angular` `19.2.15 → 19.2.27`.
3. **Dropped the `fix@^0.0.6` dependency.** It was never imported anywhere in `src/`; it only
   dragged in vulnerable `underscore` and `underscore.string`.
4. **Upgraded Angular 19 → 21** (`ng update` through 20, then 21), plus `ngx-bootstrap`
   19 → 21, `ngx-toastr` 19 → 20, `@angular-eslint/*` 20 → 21, TypeScript 5.8 → 5.9.
   Angular 19 is out of LTS and several advisories have no v19 patch at all.
5. **Migrated off the legacy webpack builder** to the esbuild-based `@angular/build:application`.
   `@angular-devkit/build-angular` is gone from `devDependencies`, and with it the last seven
   findings and 371 packages.

## Resolved

Transitive packages, now on patched versions:

| Package | Was | Now |
| --- | --- | --- |
| `websocket-driver` (critical) | 0.7.4 | 0.7.5 |
| `shell-quote` (critical) | 1.8.3 | 1.10.0 |
| `js-yaml` | 4.1.0 | 4.3.2 |
| `node-forge` | 1.3.1 | 1.4.0 |
| `glob` | 10.4.5 | 10.5.0 |
| `brace-expansion` | 1.1.12 / 2.0.2 | 1.1.18 / 2.1.4 |
| `minimatch` | 3.1.2 / 9.0.5 | 3.1.5 / 9.0.9 |
| `engine.io` | 6.6.4 | 6.6.9 |
| `socket.io-parser` | 4.2.4 | 4.2.7 |
| `fast-uri` | 3.1.0 | 3.1.6 |
| `immutable` | 5.1.3 | 5.1.9 |
| `tmp` | 0.2.5 | 0.2.7 |
| `ip-address` | 10.0.1 | 10.7.0 |
| `postcss` | 8.5.2 | 8.5.12 |
| `rollup` | 4.34.8 | 4.59.0 |
| `qs` | older | 6.15.3 |
| `lodash` | older | 4.18.1 |
| `ajv` | older | 6.15.0 / 8.18.0 |
| `webpack` | older | 5.105.0 |
| `underscore.string`, `underscore` | 1.1.4 | removed |

Angular framework advisories — all clear now. Closed within the v19 line by 19.2.25:

- XSRF token leakage via protocol-relative URLs (`@angular/common`, fixed 19.2.16)
- XSS via unsanitized SVG script attributes and i18n attribute bindings (fixed 19.2.18 / 19.2.20)
- Template and attribute namespace sanitization bypass / XSS (`@angular/core`, `@angular/compiler`, fixed 19.2.22)
- OOM DoS in number formatting via `digitsInfo` (`@angular/common`, fixed 19.2.23)
- Information leak via default caching of credentialed requests in `HttpTransferCache` (fixed 19.2.23)

Closed only by moving off v19 — these had **no v19 patch** (`<= 19.2.25`):

- `@angular/core` — Client Hydration DOM Clobbering & response-cache poisoning (high)
- `@angular/core` / `@angular/compiler` — i18n XSS via event-handler attributes (high)
- `@angular/common` — Cache-key ambiguity in `HttpTransferCache`, cross-request response reuse (high)
- `@angular/common` — Weak 32-bit cache-key hashing in `HttpTransferCache` (high)
- `@angular/common` — OOM DoS in `formatDate` (high)
- `ngx-bootstrap` 19.0.2 — no v19 fix; patched from v21

## Angular 19 → 21: what it took

`ng update` handled almost everything. Three things needed hand-fixing:

- `ngx-bootstrap` 21 dropped `Module.forRoot()`; its directives are standalone and
  `BsModalService` is `providedIn: 'root'`, so the `importProvidersFrom(ModalModule.forRoot(),
  CollapseModule.forRoot())` call in `src/main.ts` was simply deleted. `CollapseModule` is
  already imported by `AppComponent` directly.
- The control-flow migration rewrote `*ngFor ... trackBy: trackByIndex` as
  `track trackByIndex($index, item)`, but `trackByIndex` takes one argument. Changed to
  `track $index` in the two literal-array loops in `game.component.html`.
- `ngx-toastr` 20 peers on Angular `^21`, so 20 was not a valid stop — 21 is the first
  version where `ngx-bootstrap` and `ngx-toastr` line up again. Angular 22 is not viable
  yet: `ngx-toastr` has no v22-compatible release.

Migrations also converted `game.component.html` and `home.component.html` to block control
flow (`@if` / `@for`), moved deprecated bootstrap options to `provideZoneChangeDetection()`,
and switched `moduleResolution` to `bundler`.

## Build-system migration

`ng update @angular/cli --name use-application-builder` swapped every target over to
`@angular/build` (`application`, `dev-server`, `extract-i18n`, `karma`) and dropped
`@angular-devkit/build-angular` from `devDependencies`. That removed the last seven
findings — `image-size`, `less`, `webpack-dev-server`, `sockjs`, `uuid` and
`@angular-devkit/build-webpack` — along with the whole webpack toolchain: **1287 → 916
installed packages**.

Four things needed hand-fixing after the schematic:

- **The output path is pinned flat.** The migration moves the browser build to
  `dist/matching-game-angular/browser`. `Procfile` serves `dist/matching-game-angular`
  and is consumed by a deploy that lives outside this repo, so `outputPath` is set to
  `{ "base": "dist/matching-game-angular", "browser": "" }` to keep the old layout.
  `start:prod`, `build:analyze`, `lighthouserc.cjs` and the CI Lighthouse step are
  unchanged as a result.
- **`@angular/build` was pinned back to `^21.2.22`.** The schematic runs through a
  temporary *latest* CLI and wrote `^22.1.6`, one major ahead of the framework.
- **The `test` target was left half-migrated.** `polyfills` has to be an array under the
  new builder, and `src/test.ts` used `require.context`, which is webpack-only. The
  esbuild karma builder discovers `*.spec.ts` through `tsconfig.spec.json` and sets up the
  test environment itself, so `src/test.ts` is deleted and `polyfills` is now
  `["src/polyfills.ts", "zone.js/testing"]`.
- Stale `src/test.ts` entry dropped from `.prettierignore`.

`statsJson` is supported by the application builder, so `npm run build:analyze` still works.

## Verification

Run on this branch, all green. The production build was also served with
`serve -s dist/matching-game-angular` and smoke-tested: index, hashed bundles and the
`/game` deep link all return 200.

```
npm run lint          # 0 errors, 58 warnings (pre-existing no-magic-numbers / no-console)
npm run format:check  # clean
npm run test:ci       # 21/21 passing, coverage written
npm run build         # production bundle 781 kB raw / 164 kB transfer
npm run build:dev     # ok
npm audit             # found 0 vulnerabilities
```
