# Plugin layer (orca fork)

The orca fork composes its customizations as **cordis plugins**, assembled at
runtime from a versioned manifest. The architecture follows
deepseek-harness's vendored cordis stack in lighter form; the loader is
vendored into `vendor/loader` and the core comes from npm `cordis@4.0.0-rc.8`.

> This document is the specification. It is completed in phases; the
> "seams" section at the bottom is a design contract, not implemented code.

## Status

- [x] Phase 0 — loader vendored, spike green, manifest-driven assembly boots
- [x] Phase 1 — manifest + module map + server/client contexts
- [x] Phase 2 — locale plugin runtime (zh shell dictionary, store, t())
- [x] Phase 3 — shell translation (sidebar/nav/menus, auth, errors, settings)
- [x] Phase 4 — Intl locale threading (client formatters + server locale param)
- [x] Phase 5 — seams for `billing` / `seoData` / `mcp` documented; evolution
      paths recorded below. Seam implementation is separate, planned work.

## Assembly model

- **Manifest** — `src/plugins/manifest.yaml`, versioned in-repo. Rows are
  loader entry options: `{ id, name, config, disabled }`. `inject` is
  deliberately rejected at the manifest boundary until a plugin needs it
  (billing phase); plugins may still declare `inject` from their module.
- **Module map** — `src/plugins/module-map.ts` maps plugin names to static
  `import()`s. The loader's `internal` is this map; plugin resolution is
  compile-time, assembly (enable/disable/config/failure isolation) is
  runtime. workerd has no filesystem, so Node-style package resolution is
  replaced by this map on both server and client.
- **No `!js` config expressions** — workerd bans `new Function` ("Code
  generation from strings disallowed"), so the vendored evaluator throws on
  call; and cordis rc.8 emits no `internal/config` event for resolution-time
  interpolation anyway. Manifest configs must be plain YAML data.
- **No HMR, no patch layers** — the vendored `include`/`group` builtins and
  the Node-host HMR plugin are omitted; vite dev restarts cover reload needs.

## Plugin shape

A plugin is a module exporting (or default-exporting) a function or object.
This is the actual locale pilot, which is the canonical shape:

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
  all exist and re-runs when one appears/disappears/changes.
- Services are **kebab-case names** (`billing`, `seoData`, `locale`, `mcp`).
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
  module-scope singleton, wired once from `src/server.ts`).
- Client boot: `src/plugins/client/context.tsx` (`CordisProvider` mounted
  inside `ClientOnly` in `__root.tsx`; React reads services via `useService`).
  Fiber activation is async, so hooks must tolerate the boot window: the
  provider re-renders when boot settles and `useLocale` falls back to
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

## Seams (design contract, not yet implemented)

- **`billing`** — `BillingProvider` interface mirroring the six functions of
  `src/server/billing/subscription.ts` (ensureCustomer / hasPaidPlan /
  hasManagedAccess / checkCreditsDepleted / assertCreditsAvailable /
  trackSpend). Implementations: Autumn (wraps the current module), Noop
  (self-hosted). Provider selection via manifest config.
- **`seoData`** — endpoint-family interfaces over
  `src/server/lib/dataforseo/` (the facade keeps its lazy SDK boundary); the
  metering seam moves inside the adapter via `inject: ["billing"]`; Google
  connectors become a second adapter.
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
  in `module-map.ts` (`name: () => import("pkg")`). Versioning, review, and
  supply-chain policy for external plugins are open questions by design.
- **Manifest `inject`** — re-enable the `inject` field in the manifest entry
  schema when a plugin needs per-entry service injection (billing phase).
- **Dictionary growth** — zh shell keys stay eagerly bundled; if per-feature
  translation grows the dictionary beyond a few hundred entries, split
  per-page dictionaries behind the same `t()` and load them lazily.
- **Plugin settings UI** — dsh pairs its loader with a schemastery-driven
  settings UI we skipped. If a configurable plugin ships, revisit a
  settings-page renderer; not needed while configs are manifest-only.
