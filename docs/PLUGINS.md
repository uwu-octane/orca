# Plugin layer (orca fork)

The orca fork composes its customizations as **cordis plugins**, assembled at
runtime from a versioned manifest. The architecture follows
deepseek-harness's vendored cordis stack in lighter form; the loader is
vendored into `vendor/loader` and the core comes from npm `cordis@4.0.0-rc.8`.

> This document is the specification. It is completed in phases; the
> "seams" section at the bottom is a design contract, not implemented code.

## Status

- [x] Phase 0 — loader vendored, spike green, manifest-driven assembly boots
- [ ] Phase 1 — manifest + module map + server/client contexts (WIP)
- [ ] Phase 2 — locale plugin runtime (WIP)
- [ ] Phase 3 — shell translation (WIP)
- [ ] Phase 4 — Intl locale threading (WIP)
- [ ] Phase 5 — seams for `billing` / `seoData` / `mcp`

## Assembly model

- **Manifest** — `src/plugins/manifest.yaml`, versioned in-repo. Rows are
  loader entry options: `{ id, name, config, inject, disabled }`.
- **Module map** — `src/plugins/module-map.ts` maps plugin names to static
  `import()`s. The loader's `internal` is this map; plugin resolution is
  compile-time, assembly (enable/disable/config/failure isolation) is
  runtime. workerd has no filesystem, so Node-style package resolution is
  replaced by this map on both server and client.
- **No `!js` config expressions** — cordis rc.8 emits no `internal/config`
  event, so manifest configs must be plain YAML data.
- **No HMR, no patch layers** — the vendored `include`/`group` builtins and
  the Node-host HMR plugin are omitted; vite dev restarts cover reload needs.

## Plugin shape

A plugin is a module exporting (or default-exporting) a function or object:

```ts
// src/plugins/locale/index.ts
import type { Context } from "cordis";
import { z } from "zod";

export const name = "locale";
export const Config = z.object({
  defaultLocale: z.enum(["en", "zh"]).default("en"),
});

export function apply(ctx: Context, config: z.infer<typeof Config>) {
  ctx.provide("locale", makeLocaleService(config));
}
```

- `Config` is a **Zod v4 schema** (Standard Schema interop — cordis validates
  it natively; no schemastery, no custom validation layer).
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
