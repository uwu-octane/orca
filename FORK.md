# Fork maintenance log

## 2026-10-23 Keywords domain

The `keywords` plugin owns both research providers' orchestration, cache semantics, metrics and saved-keyword repositories, SERP analysis, dimension generation, and research/saved-keyword UI state. Shared routes and server functions mount or call the installed domain. Keyword MCP tools now belong to the domain and are contributed to SAM with reversible registrations, retaining the existing project binding, authorization and metering adapter. The dimension-only agent registry is retired. Query meanings, cache identities, SQL tables, billing and fallback policies remain unchanged. Common location data and search-term parsing stay shared instead of depending on keyword UI internals.

## 2026-10-23 SAM domain

The `sam` plugin owns the complete Think-backed Agent, session operations and repository, tool adaptation, prompts, telemetry, and chat UI. Server functions and Worker connection authorization call the installed service; the static `SamChatAgent` export and DO identity remain stable. The keyword domain contributes its dimension tool through lifecycle-owned registration. SAM disposal cancels model requests and contributed tools, and the client plugin releases preference subscriptions. Existing session storage, permissions, billing, recovery and provider policies are preserved.

## 2026-10-23 AI domain

AI configuration, credential persistence and decision validation now belong to `plugins/ai/server`; the full provider settings UI belongs to its client entry. Gateway owns its text and catalog implementations, while provider plugins share the SystemOne wire library. Public callers resolve the installed `ai` service; superseded feature implementations and the `ai-models` registry are removed. Registrations own cancellation, and each request revalidates its scoped credential revision. Existing routing, billing, DNS and error policies remain unchanged.

## 2026-10-23 Google authorization domain

Google authorization, connection repositories and the connection/onboarding UI now belong to the `google-oauth` Cordis plugin. The `google-ads` provider owns Ads discovery, targeting and Keyword Ideas, with an injected authorization dependency and lifecycle-owned discovery registration. GSC/GA4 reports remain in their original domains. Shared routes, server functions, reporting consumers and GDPR access resolve the installed service; framework mount views use the client plugin. OAuth callbacks, grant encryption, data tables and supplier/error policies are unchanged. See `docs/maintainers/domain-plugins.md` for branch sequence and remaining domains.

The audit Worker's Lighthouse path uses the independent audit plugin composition, preserving the shared DataForSEO implementation and metering without loading web-only authorization/router dependencies.

## 2026-10-23 AI providers and agents

Cordis now registers model providers separately from the keyword-dimension agent
implementation. Gateway text inference is shared by dimension generation and SAM;
SystemOne decisions use the same model registry. SAM keeps Think's session and
tool loop, with a project-bound dimension tool and the saved project Gateway key.
Text calls remain pinned to DeepSeek, with no automatic retry or provider switch.
SAM model usage is paid through that key, without a second platform-credit charge;
research-tool billing is unchanged. Shared-file changes are marked `FORK`.

Dimension generation uses AI SDK's terminal submission tool and a larger output
budget to accommodate reasoning. The contracts are documented in
`docs/maintainers/decision-service.md`.

## 2026-10-20 Upstream sync

Merged upstream `d7ea7852` (OpenSEO 0.1.13), including the Base UI/shadcn migration, AI visibility, audit worker and billing reservation/settlement changes. Preserved Orca branding, locale controls, Cordis provider selection and private-origin authentication. Existing Chinese dictionary entries were reconnected to the new UI; new upstream vocabulary may remain English.

The maintainer approved upstream fallback policies for model routing, audit rendering, research, rank checking and keyword queries. Portable SERP inputs now carry depth, device and location name; provider version 2 invalidates old cache entries. The vendored loader is an explicit pnpm workspace package.

## 2026-09-07 DataForSEO providers

The server manifest installs `seoData` and `dataforseo`. Application-owned Zod schemas define keyword metrics and live SERPs; their consumers resolve explicitly selected providers through Cordis. Remaining DataForSEO APIs retain their existing vendor-specific contracts behind a lazy compatibility facade, including free task collection and catalogs. The plugin owns the existing metering implementation, and malformed billed task items now retain their cost when validation fails.

Server and client module maps are separate so browser builds cannot resolve server plugins. SERP analysis cache keys include provider, provider version and schema version; previous keys expire normally and subsequent requests populate the new keys through the usual paid path. No provider fallback or new retry policy is added. Database tables remain unchanged; enabling another real metrics provider requires a separate provenance and historical-data migration. Contracts and extension guidance live in `src/plugins/seo-data/README.md` and `src/plugins/dataforseo/README.md`.

## 2026-09-07 Cordis assembly

Manifest and programmatic boot reject unknown fields, blank names/IDs, and duplicate IDs. Boot audits enabled plugins after all entries settle and disposes failed contexts before a retry. Regression tests cover dependency order, cleanup, and concurrent singleton initialization. The data-provider review is recorded in `docs/CORDIS_SEO_DATA_REVIEW.md`.

Change log for this fork of [every-app/open-seo](https://github.com/every-app/open-seo).
Branch model and rules: see "Fork maintenance" in [README.md](./README.md).

## Sync log

| Date       | Upstream base | Notes                                                            |
| ---------- | ------------- | ---------------------------------------------------------------- |
| 2026-10-20 | `d7ea7852`    | Synced upstream 0.1.13, preserving Orca customizations.          |
| 2026-08-24 | `c469a48`     | Fork created; `orca` branch cut from upstream main at `c469a48`. |

## Customizations

| Date       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                         | Commits   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-08-24 | Dev/preview default port 3001 → 8989 (`vite.config.ts` fallback + package.json `preview` script). Docker self-host port left at 3001.                                                                                                                                                                                                                                                                                                               | `b57c695` |
| 2026-08-24 | Dev/preview server binds all interfaces (`host: true`) and allows `*.local` hostnames via leading-dot `.local` syntax (Vite does not support `*` globs in `allowedHosts`).                                                                                                                                                                                                                                                                          | `6d5a6d9` |
| 2026-08-28 | Cordis plugin layer, phase 0: vendored `@orca/cordis-plugin-loader` (`vendor/loader`, from deepseek-harness, MIT — internal.ts dropped, `!js` config expressions unsupported on rc.8); `cordis@4.0.0-rc.8` exact-pinned; spec in `docs/PLUGINS.md`.                                                                                                                                                                                                 | `1abc9f2` |
| 2026-08-28 | Cordis plugin layer, phase 1: manifest boot (`src/plugins/manifest.yaml` + Zod-validated parse + static module map), dual contexts (server lazy singleton wired in `src/server.ts`; client `CordisProvider` in `__root.tsx`); vendored loader's `new Function` evaluator replaced with a throwing stub (workerd bans string codegen).                                                                                                               | `ea1fcb0` |
| 2026-08-28 | Cordis plugin layer, phase 2: locale plugin runtime — zh shell dictionary (English-as-key, 52 entries), `{param}` interpolation with English passthrough, theme-pattern preference store (localStorage + browser-language fallback), registered in the client manifest.                                                                                                                                                                             | `ed5e066` |
| 2026-08-28 | Cordis plugin layer, phase 3: shell translation — sidebar/nav/user menu, table pagination, theme + language switchers (self-described 中文/English options), sign-in route, auth chooser, error boundary, settings page. `getStandardErrorMessage` takes an optional translator; `AUDIT_PAGE_LIMIT_EXCEEDED` is a `{max}` placeholder.                                                                                                              | `3601e37` |
| 2026-08-28 | Cordis plugin layer, phase 4: Intl threading — 9 client files format via `getIntlLocale(readActiveLocale())` instead of hardcoded `"en-US"` (rank tracking, search performance, audit, AI search, billing charts); server `ga4DateInTimeZone` takes an optional locale (default `"en-US"`, additive).                                                                                                                                               | `8f5f763` |
| 2026-08-28 | Cordis plugin layer, fix: `useLocale` crashed inside `DefaultCatchBoundary` — cordis fiber activation is async, so `ctx.locale` is undefined during the first render (and boot-failure renders); the boundary itself calls the hook, so it must never throw. Hooks now fall back to English passthrough while the service is absent, and `CordisProvider` re-renders once when boot settles so mounted components re-subscribe to the real service. | `1954961` |
| 2026-08-28 | Cordis plugin layer, fix 2: the boot-settle re-render from `1954961` didn't reach consumers — React skips context propagation when the value is Object.is-equal, and `ctx` is stable, so hooks mounted during the boot window stayed frozen on the English fallback (language switcher had no visible effect). The `settled` flag now lives in the context value itself, flipping its identity so consumers re-subscribe to the real services.      | `76feef0` |

| 2026-08-28 | Cordis plugin layer, phase 6: deep-page i18n — 12-round batch translation of all feature pages to zh-CN (dashboard, domain, audit, keywords, saved keywords, backlinks, rank tracking, gsc/search-performance/lighthouse, ai-search, billing/projects, onboarding/sam/ga4/integrations, shared routes). Per-feature dictionaries merged behind `locales/zh/index.ts`; commits `48bd8fc`…`9768550`. Review pass: 2 conflicting duplicate keys reconciled, 62 identical cross-dictionary duplicates centralized to one owner, 27 phrasing fixes, and the missed `ApiKeySettings.tsx` translated (new `zh/settings.ts`). | `7cb86f1` |
| 2026-08-29 | i18n completion, server error copy: `getStandardErrorMessage(error, fallback?, translator?)` now threads `useLocale()` `t` through every call site (hooks/components call the hook; pure modules thread `t` from callers per `DefaultCatchBoundary`). Error-code dictionary expanded (plural pairs, `AUTH_CONFIG_MISSING` details, auth flow, verify-email copy, checkout/analytics/export feedback). Server files untouched; client code never imported server-side. | `8952bde` |
| 2026-08-29 | i18n completion, missed-translation scan: scripted sweep of JSX text plus placeholder/aria-label/title/alt attributes across routes and client features; ~75 text + ~80 attribute strings translated into per-scope dictionaries (shell, settings, routes, projects, dashboard, rank-tracking, backlinks, domain, billing, gsc, keywords, ai-search, audit, saved-keywords, search-performance). 5 duplicate keys introduced by parallel agents deduped to existing owners. | `0ef173c` |
| 2026-08-29 | i18n completion, API-driven display copy: render-site `t()` mapping for DataForSEO/registry-driven values — audit issue registry (79 titles/explanations/how-to-fix in `zh/audit.ts`), SERP feature short labels + tooltips, Lighthouse issue severity/category values, brand-lookup target type. Bounded enums only; open data sets (location names, GSC countries, `detailsJson` pairs) intentionally left as data. | `136a73d` |

## Skipped / reverted upstream changes

| Upstream commit | Why skipped                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| —               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-28      | Cordis plugin layer, fix 3: `translate` was locale-blind — it returned the zh entry whenever a key existed in the dictionary, so the shell always rendered Chinese and selecting English (or any preference) had no visible effect. It now reads `readActiveLocale()` at call time; the zh dictionary applies only while zh is active, and English passes the keys through. Regression tests cover en preference and browser-following preference. | `b3670ed` |
| 2026-08-28      | Cordis plugin layer, phase 6 prep: zh dictionary split into per-scope files behind a merge entry (`locales/zh/index.ts` merges `shellZh`; feature dictionaries join the merge and extend `ShellKey` automatically). Zero behavior change.                                                                                                                                                                                                          | `30a49c5` |
| 2026-08-30      | Auth: `cloudflare_access` mode gains a private-origin fallback — requests without an Access JWT from private/loopback hosts (localhost, `.local`, RFC1918, 198.18/15) resolve as `local_noauth`, public hosts fail closed. One deployment serves LAN dev and a tunneled public hostname; TEAM_DOMAIN/POLICY_AUD are only required when a token is verified.                                                                                        | `e8bb602` |
