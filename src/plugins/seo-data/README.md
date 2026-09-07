# SEO data capability contract

`SeoDataService` owns the application protocol for `keywordMetrics` and
`serpLive`. The executable definitions are in [schemas.ts](./schemas.ts);
TypeScript inputs and outputs are inferred from Zod. They have no dependency
on the DataForSEO SDK. The existing [DataForSEO plugin](../dataforseo/README.md)
implements both capabilities.

## Calls

The public functions in [server/lib/seo-data.ts](../../server/lib/seo-data.ts)
initialize the configured Context for HTTP, MCP, Workflow and DO invocations.
Each call carries a `BillingCustomerContext` from the existing authenticated
caller; never construct it from unverified request fields. It is passed to
the selected provider and never stored on the singleton service.

| Capability       | Request                                                                                                        | Result                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `keywordMetrics` | keywords, locationCode, languageCode, required creditFeature; optional locationName and includeClickstreamData | Array of keyword, searchVolume, cpc, competition, competitionLevel, keywordDifficulty, intent, monthlySearches                          |
| `serpLive`       | keyword, locationCode, languageCode; optional creditFeature                                                    | Array of SERP items with type, group/absolute ranks, URL/domain/title/description and optional traffic/backlink/rank-change information |

`locationCode` retains the application's existing geographic identifiers.
An implementation must map them explicitly to its own geography. A local
`locationName` is the existing canonical sub-country name. For metrics,
local volume/CPC/competition and national KD/intent retain their different
scopes. The first adapter preserves Labs/Google Ads selection and batching.

Null metric values mean unavailable; numeric zero is data. Competition is a
0–1 ratio. The current monthly number representation is preserved, including
zero placeholders produced by the existing adapter. Intent stays a nullable
string here; application-specific enum projection remains in its consumers.
The contract does not add imputation or substitute data from another source.

Live SERPs retain Google desktop/Windows results with depth 100. Snake-case
result fields preserve the existing application protocol. `rank_group` and
`rank_absolute` remain separate, and consumers keep their existing choice
of rank field. Passthrough result fields preserve existing projections.
Do not claim support if an implementation cannot honor these query semantics.

## Registration and selection

A provider plugin declares `inject: ["seoData"]` and calls
`registerKeywordMetrics` and/or `registerSerpLive`. Each registration supplies
an id, a semantic version string, and a typed `query(input, customer)` method.
Registration belongs to the calling plugin's Cordis effect scope; unloading
that plugin removes its registrations. Duplicate IDs within a capability
are rejected. The same ID may implement both capabilities.

The manifest config names both selected IDs explicitly:

```yaml
config:
  keywordMetrics: dataforseo
  serpLive: dataforseo
```

Selection never uses registration order or another provider after a failure.
Missing configured providers fail route validation after the full tree
settles. Inputs are parsed before execution; outputs are parsed before
returning to the caller. Boot only registers implementations and validates
configuration; it must not load supplier SDKs or call paid APIs.

Providers own authenticated execution and metering. A paid implementation
must check the organization allowance and record every charged upstream
operation through the existing subscription helpers, including charged
failures. Do not wrap the already metered DataForSEO adapter with another
charge. The service cannot infer a different supplier's price or retry policy.

## Cache and persistence

`serpCacheIdentity()` contains the selected provider ID, its semantic
version, and schema version 1. The SERP analysis cache includes that identity,
so a changed provider cannot reuse another provider's result. This change
invalidates the previous SERP-analysis cache keys; an ordinary subsequent
query fills the new cache through the normal paid path. No bulk refresh runs.

Change the provider version when its dataset, geographic mapping or
normalization changes. The manifest is bundled and changes take effect on
deployment; this implementation does not support runtime manifest mutation.

Only DataForSEO is installed in production configuration. Persistent keyword
metrics retain the existing tables and values. Before enabling a different
real metrics provider, define metric provenance, historical-value handling
and comparisons, and migrate SQLite/Postgres together. This is separate from
proving replacement with in-memory test providers; it must not be hidden in
a field default or a compatibility path.

## Extending the contract

Add capabilities when there is a concrete replacement requirement. Define
application inputs/results, add typed registration and explicit routing, and
migrate every consumer of that capability. Existing domain, backlinks,
research-mode and queued-task protocols are still vendor-specific; they
are not covered by these two portable schemas. In-flight provider task IDs
must stay bound to their original provider before task replacement is enabled.

Tests cover the real loader path, provider selection and disposal, invalid
input/output, independent capabilities and per-call organization identity.
Any new fallback, enrichment, cross-provider retry or stale-data policy needs
maintainer agreement before implementation.
