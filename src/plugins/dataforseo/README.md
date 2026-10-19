# DataForSEO plugin

The server manifest mounts this named function plugin after declaring the
`seoData` service. It registers keyword metrics and live SERPs on that
service and provides `ctx.dataforseo` for the remaining vendor-specific API.
See the [capability contract](../seo-data/README.md) for the portable schemas.

The plugin has no credential-bearing config. Requests obtain
`DATAFORSEO_API_KEY` through the existing Worker runtime environment helper;
credentials and organization identity are not captured during boot.

## Compatibility API

`DataforseoProvider` in [index.ts](./index.ts) declares `createClient`, free
rank/business/local/AI tracking task collection, business categories and geographic lookup.
The public [DataForSEO facade](../../server/lib/dataforseo/index.ts) delegates
to the installed provider. Its synchronous client factory returns asynchronous
methods, preserving callers and the lazy first-request boundary.

The compatibility method inputs/outputs retain upstream typed REST/Zod
contracts where the application has not yet defined a portable capability.
They are not a promise that another supplier can implement DataForSEO's
filters, scores or task lifecycle. Offline cost/account diagnostic scripts
remain explicit vendor tools and may call the low-level DataForSEO modules.

## Billing and loading

[client.ts](./client.ts) owns the metered client and the dynamic import of
the DataForSEO section modules. Boot and client construction perform no
upstream I/O and do not import the request sections. Each metered invocation obtains its
organization identity from the caller. Hosted mode keeps the established
hold/settle billing, per-request cost rounding and shared spending helpers;
self-hosted mode keeps its existing billing behavior.

Task submission is charged at the existing endpoint; DataForSEO task
collection and catalogs remain free. Response validation retains reported
cost when billed items are malformed. HTTP retry, task polling, Labs/Ads
coverage, local/national metric composition, clickstream behavior and batch
limits remain in their existing implementations. No new retry or fallback
strategy is introduced by the plugin.

Plugin tests load the actual manifest and public facades with keyless section
fixtures. Existing adapter tests continue to verify requests, costs, charged
failures and task results. Worker builds must keep request implementations behind the lazy
section import and client bundles must not contain server plugin imports.
