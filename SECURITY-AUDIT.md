# Security Audit Report

**Generated:** 2026-09-02
**Project:** Rotomatch v1.0.0
**Audit Level:** Moderate and above

## Summary

`npm audit` before this pass: **74 vulnerabilities** (3 critical, 48 high, 20 moderate, 3 low).
After: **34 vulnerabilities** (1 critical, 24 high, 7 moderate, 2 low).

Every remaining finding is blocked on an Angular major upgrade — see "Remaining" below.
There is nothing left that a non-breaking update can fix.

## What was done

1. **Regenerated `package-lock.json`.** It was out of sync with `package.json` (missing the
   platform-specific `@rollup/rollup-*` optional packages), so `npm ci` failed outright and
   `npm i` silently pinned stale transitive versions. All transitive dependencies now resolve
   to their patched releases.
2. **Bumped Angular to the end of the v19 line:** framework packages `19.2.14 → 19.2.25`,
   CLI and `@angular-devkit/build-angular` `19.2.15 → 19.2.27`.
3. **Dropped the `fix@^0.0.6` dependency.** It was never imported anywhere in `src/`; it only
   dragged in vulnerable `underscore` and `underscore.string`.

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

Angular-side advisories closed by 19.2.25 / 19.2.27, among them:

- XSRF token leakage via protocol-relative URLs (`@angular/common`, fixed 19.2.16)
- Template and attribute namespace sanitization bypass / XSS (`@angular/core`, `@angular/compiler`, fixed 19.2.22)
- OOM DoS in number formatting via `digitsInfo` (`@angular/common`, fixed 19.2.23)
- Information leak via default caching of credentialed requests in `HttpTransferCache` (fixed 19.2.23)
- XSS via unsanitized SVG script attributes and i18n attribute bindings (fixed 19.2.18 / 19.2.20)

## Remaining — blocked on an Angular major upgrade

Angular 19 has reached the end of its LTS window: `19.2.25` is the last release on that line,
and several advisories carry **no v19 patch at all**. They are only fixed in Angular 20+.

Framework advisories with no v19 fix (`<= 19.2.25`):

- `@angular/core` — Client Hydration DOM Clobbering & response-cache poisoning (high)
- `@angular/core` / `@angular/compiler` — i18n XSS via event-handler attributes (high)
- `@angular/common` — Cache-key ambiguity in `HttpTransferCache`, cross-request response reuse (high)
- `@angular/common` — Weak 32-bit cache-key hashing in `HttpTransferCache` (high)
- `@angular/common` — OOM DoS in `formatDate` (high)

Build-chain packages pinned by `@angular-devkit/build-angular@19.2.27` and unpatchable
without it moving: `tar` (critical), `vite`, `piscina`, `postcss` (build-angular's nested
copy), `webpack-dev-server`, `serialize-javascript`, `http-proxy-middleware`, `less` /
`image-size`, `sigstore` / `@sigstore/*`, `pacote`, `copy-webpack-plugin`, `sockjs`,
`uuid`, `@babel/core`, `esbuild`.

`ngx-bootstrap@19.0.2` also has an advisory with no v19 fix; it is patched in v22, which
in turn requires Angular 20+.

**Exposure note:** the build-chain findings are dev-time only — they do not ship in the
production bundle. The `@angular/core` and `@angular/common` ones do, and the deployment
at `rotomatch.aporkolab.com` is a client-rendered SPA, so the hydration and
`HttpTransferCache` findings need SSR to be exploitable and the i18n ones need i18n
attribute bindings. The XSS advisories are still the ones worth prioritising.

**Next step:** `ng update @angular/core@20 @angular/cli@20`, then step to 21 and 22, and
bump `ngx-bootstrap` / `ngx-toastr` alongside. That is a separate change with real
regression risk and should not ride along with a lockfile refresh.

## Verification

Run on this branch, all green:

```
npm run lint          # 0 errors, 58 warnings (pre-existing no-magic-numbers / no-console)
npm run format:check  # clean
npm run test:ci       # 21/21 passing
npm run build         # production bundle 748 kB raw / 158 kB transfer
```
