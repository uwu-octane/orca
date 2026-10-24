# Cordis domain migration

Orca follows DeepSeek Harness's service/provider/consumer separation and lifecycle-owned registrations. Domain plugins own actual services, persistence queries, client components and state. The existing manifest and separate server/client module maps remain the composition root; Workers still use static platform exports. No package-per-function extraction or parallel legacy implementation is retained.

## Branch sequence

Branches stack in this order. Finish validation and commit a domain before starting the next branch. Do not push or merge without the maintainer's instruction.

| Domain               | Branch                     | State    |
| -------------------- | -------------------------- | -------- |
| Google authorization | `codex/cordis-google-auth` | Complete |
| AI                   | `codex/cordis-ai`          | Complete |
| SAM                  | `codex/cordis-sam`         | Complete |
| Keywords             | `codex/cordis-keywords`    | Complete |

The starting checkpoint is `712454e1` on `codex/google-keyword-provider`. Each domain commit and its validation evidence are recorded below as it completes.

Google authorization validation: 252 test files / 1,826 tests passed, `pnpm ci:check` and `pnpm build` passed. The local development application and client plugin modules return HTTP 200 after rebuilding and restarting both Worker environments. Authorization tests exercise persisted grants, PKCE/state replay, account-removal transactions, connection selection, dependency activation and plugin disposal. No live supplier calls or visual UI checks were performed.

AI validation: 253 test files / 1,829 tests passed; the final configuration and lifecycle suite passed after lint cleanup. `pnpm ci:check` and `pnpm build` passed. The local app and AI client entry/mount modules return HTTP 200. Supplier responses were mocked; no paid calls or visual checks were used.

## Domain ownership

### Google authorization

`google-oauth` owns state/PKCE, callbacks, grant/token lifecycle, account removal, GSC/GA4/Ads project bindings and the entire connection/onboarding UI. Its repositories own grant and binding SQL. Application login, Cloudflare Access and MCP authorization remain in the existing authentication layer. GSC/GA4 reporting and URL inspection stay in their reporting domains.

`google-ads` owns the protocol client, customer discovery, targeting catalogs and Keyword Ideas. It injects `googleOAuth` and registers discovery with a reversible effect. OAuth knows the discovery contract, not the Ads implementation. Targeting obtains credentials through the injected authorization service. The keyword domain owns cache identity and metrics persistence, including for cached results.

Framework callbacks and server functions keep their existing URLs and middleware. They call `getGoogleOAuth()` or `getGoogleAds()`. Authorized internal reporting callers use the same installed service for tokens/connections. The public contract exposes connection types without importing repositories. Client routes and settings mount the registered `googleConnections` views; query options remain domain-owned public client utilities.

The auxiliary audit Worker has its own manifest/module map for SEO and DataForSEO. Lighthouse uses that composition so the Google authorization plugin cannot pull TanStack web entrypoints into the auxiliary Worker. Both compositions share the same provider implementation and metering.

### AI

`ai` owns provider configuration, encrypted key persistence, text/decision contracts, model discovery orchestration and the complete settings UI. It replaces the narrow `ai-models` registry. Gateway and SystemOne plugins own their actual protocol implementations rather than importing legacy feature services. Gateway owns text, catalog and its decision endpoint; SystemOne owns TypeSafe and explicitly configured local endpoints. Model IDs are selected at call sites, with the existing DeepSeek text and Jev decision defaults.

The former `features/ai`, `features/decision` implementations and settings components now live inside the domain and its provider plugins. `contracts.ts` defines scope, model and provider capabilities. Only summary/configuration operations are public; credential resolution and revision checks remain internal. Each provider registration owns an abort signal, so unloading prevents retained models from issuing new requests and cancels in-flight calls. Gateway and local/TypeSafe providers share the SystemOne wire library in `plugins/shared/systemone.ts`, with endpoint selection in the provider. Existing credentials, DNS and routing policies are unchanged.

### SAM

`sam` owns session operations/repository, the complete Think-backed Agent, prompts, skills, tool adaptation, output limiting, telemetry, recovery and client chat surfaces. Server functions and Worker connection authorization delegate business operations to the installed service. Cloudflare's static `SamChatAgent` export, binding name and durable transcript remain stable. Changing Agent engines requires a real session/stream/cancellation/recovery implementation and is not implied by a provider swap.

SAM consumes AI and project context. Its tool registration accepts lifecycle-owned contributions; the keyword domain may contribute a tool without creating a hard dependency in either direction. Existing MCP handlers remain shared with external MCP to preserve authorization and billing behavior.

### Keywords

`keywords` owns both research flows, cache orchestration, SQL metrics repositories, saved keywords/tags, SERP analysis, dimension generation, keyword tools and both research/saved-keyword UIs. The implementation and state moved from `features/keywords`, `features/saved-keywords` and the saved-keyword route. The dimension-only `ai-agents` and `keyword-dimension-agent` registrations are removed. Capability-specific `ctx.inject` scopes let saved data remain available without a supplier or AI provider. Keywords contributes its MCP tool definitions and internal dimension tool to SAM through lifecycle-owned registration; external MCP mounts the same definitions. The shared SAM adapter still owns project binding, instrumentation and output shaping.

Keep DataForSEO and direct Google Ads semantics distinct. DataForSEO's Ads-derived dataset is not the direct Google Ads API. Existing metrics and caches remain provider-specific. Dimension drafts are currently component state; durable dimensions and bulk classification are separate product work.

## Shared infrastructure and invariants

- Keep database clients, SQLite/Postgres schemas and migrations, auth middleware, encryption libraries, R2 transport and shared UI primitives in the application infrastructure. Domain repositories own domain queries.
- Root services carry no user/project credentials. Scope is explicit on calls; plugin boot does not read credentials or contact suppliers.
- Disposing a plugin unregisters its services, providers, tools and listeners, without deleting durable grants, settings or sessions.
- Preserve OAuth callback paths, single-use state, PKCE, encrypted grants, per-user isolation and account-removal atomicity. Existing legacy connection selection behavior remains unchanged.
- Preserve configured DNS checks, DeepSeek-only Gateway routing, retry/fallback policies and billing seams. Any policy change requires explicit maintainer approval before implementation.
- Validate through registered service entry points with real SQL for persistence and mocked supplier responses. Check tenant isolation, lifecycle teardown, existing behavior, type/lint checks and production build. The maintainer performs visual UI verification.

Google authorization checkpoint: `a1d5dc81`. AI work is stacked on that commit in `codex/cordis-ai`.

AI checkpoint: `35181007`. SAM work is stacked on that commit in `codex/cordis-sam`.

SAM validation: 256 test files / 1,843 tests passed, followed by 43 focused tests after type/lint cleanup. `pnpm ci:check` and `pnpm build` passed. The app and SAM client modules return HTTP 200. Tests cover session authorization and archival through real SQL, lifecycle-owned tool cancellation, request context isolation, model cancellation on SAM unload, and client preference teardown. No paid supplier calls or visual checks were used.

SAM checkpoint: `3ffc5cfa`. Keywords is stacked on that commit in `codex/cordis-keywords`.

Keywords validation: 256 test files / 1,846 tests passed; `pnpm ci:check` and `pnpm build` passed. Real SQL tests cover Google metrics persistence (including cache hits) and saved-keyword/tag isolation. Service tests cover optional dependency activation, SAM contribution disposal and cancellation of dimension generation when Keywords or AI is unloaded. External MCP and SAM retain the shared authorization, billing and output adapter. After rebuilding, the local app and all four domains’ client entry modules return HTTP 200. Supplier responses were mocked; visual UI verification remains with the maintainer. No push or merge was performed.
