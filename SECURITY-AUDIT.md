# Security Audit Report

**Generated:** 2026-09-02
**Project:** Rotomatch v1.0.0
**Audit Level:** Moderate and above

## Summary

`npm audit` before this pass: **74 vulnerabilities** (3 critical, 48 high, 20 moderate, 3 low).
After the lockfile refresh: **34** (1 critical, 24 high, 7 moderate, 2 low).
After the Angular 19 → 21 upgrade: **7** (0 critical, 3 high, 4 moderate).

Nothing that ships in the production bundle is flagged any more. All seven remaining
findings sit inside `@angular-devkit/build-angular`, the legacy webpack builder, and are
dev-time only.

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

## Remaining — all dev-time

Seven findings, all reached through `@angular-devkit/build-angular@21.2.22` (the legacy
webpack builder): `image-size` and `less` (high), `webpack-dev-server`, `sockjs`, `uuid`
and `@angular-devkit/build-webpack` (moderate).

None of them ship in the production bundle — they are build-server and asset-pipeline code.
They disappear entirely by migrating to the modern esbuild-based builder:

```
ng update @angular/cli --name use-application-builder
```

That changes the output layout (`dist/matching-game-angular/browser`), so the
`start:prod` script, `lighthouserc.cjs` and the CI deploy jobs need their paths updated
alongside. Left out of this change deliberately.

## Verification

Run on this branch, all green:

```
npm run lint          # 0 errors, 58 warnings (pre-existing no-magic-numbers / no-console)
npm run format:check  # clean
npm run test:ci       # 21/21 passing
npm run build         # production bundle 767 kB raw / 162 kB transfer
```
