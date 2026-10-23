# Plugin layer (orca fork)

The orca fork composes its customizations as **cordis plugins**, assembled at
runtime from a versioned manifest. The architecture follows
deepseek-harness's vendored cordis stack in lighter form; the loader is
vendored into `vendor/loader` and the core comes from npm `cordis@4.0.0-rc.8`.

This document describes the installed plugin layer. Provider contracts and
extension instructions live in [the SEO capability README](../src/plugins/seo-data/README.md).

## Status

- [x] Phase 0 — loader vendored, spike green, manifest-driven assembly boots
- [x] Phase 1 — manifest + module map + server/client contexts
- [x] Phase 2 — locale plugin runtime (zh shell dictionary, store, t())
- [x] Phase 3 — shell translation (sidebar/nav/menus, auth, errors, settings)
- [x] Phase 4 — Intl locale threading (client formatters + server locale param)
- [x] Phase 5 — seams for `billing` / `seoData` / `mcp` documented; evolution
      paths recorded below.
- [x] Phase 6 — strict assembly, DataForSEO plugin, and independently selected
      keyword-metrics/live-SERP capabilities with application-owned schemas.

## Assembly model

- **Manifest** — `src/plugins/manifest.yaml`, versioned in-repo. Rows are
  loader entry options: `{ id, name, config, disabled }`. `inject` is
  deliberately rejected at the manifest boundary until a plugin needs it
  (billing phase); plugins may still declare `inject` from their module.
  Unknown fields, blank ids/names, and duplicate ids within either side are
  rejected before mounting any plugin. Programmatic boot uses the same checks.
- **Module maps** — `src/plugins/server/modules.ts` and
  `src/plugins/client/modules.ts` map plugin names to static `import()`s.
  `src/plugins/module-map.ts` provides only the shared resolver. Keeping
  imports in separate files prevents the browser build from parsing server
  modules. The loader's `internal` uses the relevant map; plugin resolution is
  compile-time, assembly (enable/disable/config/failure isolation) is
  runtime. workerd has no filesystem, so Node-style package resolution is
  replaced by this map on both server and client.
- **Audit Worker** — `src/plugins/audit/manifest.yaml` and its module map
  assemble SEO/DataForSEO independently. Lighthouse resolves that tree rather
  than the web application's tree; web authorization and TanStack router
  dependencies must not enter the auxiliary Worker's import graph.
- **No `!js` config expressions** — workerd bans `new Function` ("Code
  generation from strings disallowed"), so the vendored evaluator throws on
  call; and cordis rc.8 emits no `internal/config` event for resolution-time
  interpolation anyway. Manifest configs must be plain YAML data.
- **No HMR, no patch layers** — the vendored `include`/`group` builtins and
  the Node-host HMR plugin are omitted; vite dev restarts cover reload needs.

## Plugin shape

A function plugin uses named `name` / `inject` / `Config` / `apply` exports.
Do not also default-export `apply`: loader unwrapping would lose the sibling
metadata. Service classes use a default export. The locale pilot uses:

```ts
// src/plugins/locale/index.ts
import type { Context } from "cordis";

export const name = "locale";

export function apply(ctx: Context): void {
  ctx.provide("locale", makeLocaleService());
}
```

A plugin that takes configuration additionally exports `Config`, a **Zod v4
schema** (Standard Schema interop — cordis validates it natively; no
schemastery, no custom validation layer):

```ts
import { z } from "zod";

export const Config = z.object({
  defaultLocale: z.enum(["en", "zh"]).default("en"),
});

export function apply(ctx: Context, config: z.infer<typeof Config>) {
  // ...
}
```

The locale pilot itself has no `Config`; its preference is runtime state
(localStorage on the client), not boot-time configuration.

- `inject: string[]` lists required services; the fiber stays pending until
  all exist and re-runs when one appears/disappears/changes. Boot waits for
  the complete manifest and rejects enabled entries that remain inactive.
- Services have stable Context keys (`seoData`, `dataforseo`, `locale`).
  Subclass `Service` for lifecycle or swappable implementations; use plain
  `ctx.provide(name, value)` for simple value services (the locale service).
- Declare services on `Context` via `declare module "cordis"`.

## Runtime rules

- **Services are stateless.** Request-scoped data (user context, org id,
  clients) travels as function arguments through the existing
  "TanStack server function → service → repository" path. When a service
  needs per-request state, boot a child scope with `ctx.isolate` (documented
  evolution path, not built).
- Server boot: `src/plugins/server/context.ts` (`getAppContext()`, lazy
  module-scope singleton, wired once from `src/server.ts`). A failed boot
  disposes its fresh context before rejecting; concurrent requests share
  that failure and the next request can create a fresh tree.
  Configured SEO routes are validated after the full tree is mounted.
  Application calls use `getSeoData()` or the compatibility provider getter,
  so scheduled handlers, Workflows and DOs initialize without a prior HTTP
  request. Boot performs no supplier requests or credential reads.
- Client boot: `src/plugins/client/context.tsx` (`CordisProvider` mounted
  inside `ClientOnly` in `__root.tsx`; React reads services off the context).
  Fiber activation is async, so hooks must tolerate the boot window: the
  provider flips a `settled` flag in the context value when boot settles
  (a stable ctx alone would short-circuit context propagation, leaving
  mounted hooks frozen on the fallback), and `useLocale` falls back to
  English passthrough while a service is absent — the error boundary calls
  it, so it must never throw.
- **Banned:** dynamic plugin loading outside the manifest; one-off service
  abstractions; `node:` imports in plugin code; server↔client imports.
- Tests are plain vitest (node env): `new Context()` + `ctx.plugin(...)` or a
  minimal loader boot, assert service behavior, `ctx.fiber.dispose()` in
  `afterEach`. Injectable storage keeps client plugins testable without jsdom.

## Fork rules

- `vendor/**`, `src/plugins/**`, and this file are fork-owned; upstream sync
  never touches them.
- Edits to shared files outside these trees carry a `// FORK:` comment and a
  `FORK.md` entry — conflicts with upstream are expected and accepted; the
  marks exist to locate them.

## Installed data services

- **`seoData`** owns the keyword-metrics and live-SERP request/result schemas
  and explicit provider selection. Implementations register with a
  lifecycle-owned effect. Its manifest config selects each capability by id.
- **`dataforseo`** provides the existing vendor-specific client, free task
  collection, category lookup and geographic catalog. Its plugin registers
  the two portable capabilities on `seoData`. Public compatibility calls in
  `src/server/lib/dataforseo` resolve this installed plugin on every call;
  they never construct an alternate implementation if it is absent.
- Metering lives in `src/plugins/dataforseo/client.ts` and continues using
  the existing subscription helpers. SDK sections load only when a real
  call executes. No billing wrapper is added outside an already metered
  provider call. Billed item-validation failures retain their cost.

The keyword-metrics capability is used by saved-keyword refresh, tracker
metrics refresh and MCP `get_keyword_metrics`. All existing `serp.live`
calls use the selected live-SERP capability. Other DataForSEO methods retain
their vendor-specific types through the compatibility API. Schema ownership
does not imply different vendors' scores are directly comparable.

## Google authorization and Ads

- `googleOAuth` owns the complete Google data-authorization lifecycle, connection repositories and GSC/GA4/Ads project bindings. It does not own application sign-in or report queries.
- `googleAds` owns Ads protocol calls, account discovery, targeting and keyword ideas. It injects `googleOAuth` and registers discovery as a lifecycle effect. The authorization service depends on a discovery contract rather than importing Ads implementation code.
- The client `google-oauth` plugin owns connection cards, property selection and onboarding. It injects `locale` and provides `googleConnections`; framework mount views read that service with `useClientService`, including async activation and disposal. Consent redirect state, subscriptions and the navigation-recovery timer belong to that plugin instance and are released on disposal.
- Callback URLs, database tables and encrypted credentials remain unchanged. Existing callers resolve installed services through the server context. Disabling a plugin does not erase stored authorizations.

The full domain migration and ownership rules are maintained in
[Domain plugins](maintainers/domain-plugins.md).

## Planned services

- **`billing`** — `BillingProvider` interface mirroring the six functions of
  `src/server/billing/subscription.ts` (ensureCustomer / hasPaidPlan /
  hasManagedAccess / checkCreditsDepleted / assertCreditsAvailable /
  trackSpend). Implementations: Autumn (wraps the current module), Noop
  (self-hosted). Provider selection via manifest config.
- **`mcp`** — `ctx.mcp.registerTool(name, zodSchema, handler)`; tool plugins
  declare `inject: ["seoData", "billing"]`.

## Evolution paths (recorded, not scheduled)

- **Build-free runtime manifests** — today the manifest ships in the bundle
  (vite dev hot-reloads it; production workerd re-deploys it). Runtime-editable
  manifests for self-hosted installs need a KV-backed manifest store the
  server context reads at boot. Not planned until a self-host user asks.
- **Per-request state** — when a service genuinely needs request scope, boot a
  child context with `ctx.isolate` inside the request handler rather than
  growing a stateful service. The server tree itself stays stateless.
- **Third-party plugins** — a plugin published outside this repo is one line
  in the appropriate `server/modules.ts` or `client/modules.ts` map
  (`name: () => import("pkg")`). Versioning, review, and
  supply-chain policy for external plugins are open questions by design.
- **Manifest `inject`** — re-enable the `inject` field in the manifest entry
  schema when a plugin needs per-entry service injection (billing phase).
- **Dictionary growth** — zh shell keys stay eagerly bundled; if per-feature
  translation grows the dictionary beyond a few hundred entries, split
  per-page dictionaries behind the same `t()` and load them lazily.
- **Plugin settings UI** — dsh pairs its loader with a schemastery-driven
  settings UI we skipped. If a configurable plugin ships, revisit a
  settings-page renderer; not needed while configs are manifest-only.
