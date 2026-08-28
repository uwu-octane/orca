# Fork maintenance log

Change log for this fork of [every-app/open-seo](https://github.com/every-app/open-seo).
Branch model and rules: see "Fork maintenance" in [README.md](./README.md).

## Sync log

| Date       | Upstream base | Notes                                                            |
| ---------- | ------------- | ---------------------------------------------------------------- |
| 2026-08-24 | `c469a48`     | Fork created; `orca` branch cut from upstream main at `c469a48`. |

## Customizations

| Date       | Description                                                                                                                                                                                                                                                                                                                            | Commits   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-08-24 | Dev/preview default port 3001 → 8989 (`vite.config.ts` fallback + package.json `preview` script). Docker self-host port left at 3001.                                                                                                                                                                                                  | `b57c695` |
| 2026-08-24 | Dev/preview server binds all interfaces (`host: true`) and allows `*.local` hostnames via leading-dot `.local` syntax (Vite does not support `*` globs in `allowedHosts`).                                                                                                                                                             | `6d5a6d9` |
| 2026-08-28 | Cordis plugin layer, phase 0: vendored `@orca/cordis-plugin-loader` (`vendor/loader`, from deepseek-harness, MIT — internal.ts dropped, `!js` config expressions unsupported on rc.8); `cordis@4.0.0-rc.8` exact-pinned; spec in `docs/PLUGINS.md`.                                                                                    | `1abc9f2` |
| 2026-08-28 | Cordis plugin layer, phase 1: manifest boot (`src/plugins/manifest.yaml` + Zod-validated parse + static module map), dual contexts (server lazy singleton wired in `src/server.ts`; client `CordisProvider` in `__root.tsx`); vendored loader's `new Function` evaluator replaced with a throwing stub (workerd bans string codegen).  | `ea1fcb0` |
| 2026-08-28 | Cordis plugin layer, phase 2: locale plugin runtime — zh shell dictionary (English-as-key, 52 entries), `{param}` interpolation with English passthrough, theme-pattern preference store (localStorage + browser-language fallback), registered in the client manifest.                                                                | `ed5e066` |
| 2026-08-28 | Cordis plugin layer, phase 3: shell translation — sidebar/nav/user menu, table pagination, theme + language switchers (self-described 中文/English options), sign-in route, auth chooser, error boundary, settings page. `getStandardErrorMessage` takes an optional translator; `AUDIT_PAGE_LIMIT_EXCEEDED` is a `{max}` placeholder. | `3601e37` |
| 2026-08-28 | Cordis plugin layer, phase 4: Intl threading — 9 client files format via `getIntlLocale(readActiveLocale())` instead of hardcoded `"en-US"` (rank tracking, search performance, audit, AI search, billing charts); server `ga4DateInTimeZone` takes an optional locale (default `"en-US"`, additive).                                  | `8f5f763` |
| 2026-08-28 | Cordis plugin layer, fix: `useLocale` crashed inside `DefaultCatchBoundary` — cordis fiber activation is async, so `ctx.locale` is undefined during the first render (and boot-failure renders); the boundary itself calls the hook, so it must never throw. Hooks now fall back to English passthrough while the service is absent, and `CordisProvider` re-renders once when boot settles so mounted components re-subscribe to the real service.                                                                                                                                                        | (bugfix) |

## Skipped / reverted upstream changes

| Upstream commit | Why skipped |
| --------------- | ----------- |
| —               | —           |
