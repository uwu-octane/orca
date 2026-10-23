# Google keyword provider foundation

The keyword research page has separate DataForSEO and Google Ads tabs.
Existing links without `provider` open DataForSEO; `provider=google_ads`
opens the direct Google Ads adapter. Only the selected page is mounted.
Switching providers preserves the existing DataForSEO URL query but does not
submit it to Google. Google queries require an explicit form submission or
history selection.

## Scope

This is a self-hosted foundation, not the completed classification workflow.
The Google tab supports keyword seeds, searchable location/language selection,
network, adult-keyword setting, bounded page size and explicit pagination.
There is no automatic collection of every page. Page order remains Google's
order; it is not a search-volume ranking.

DataForSEO keeps its existing modes, clickstream, location routing, billing,
saved keywords, SERP requests and MCP behavior. None of those supplier-specific
options are mapped to Google. Google requests do not call DataForSEO or Jev.
No new fallback, automatic retry, extra seed, model substitution or fabricated
metric is introduced.

## Execution and storage

`researchGoogleKeywords` validates input and uses `requireProjectContext`.
`GoogleKeywordResearchService` injects the verified project ID, then uses the
Google adapter and the existing R2 cache service.

The cache identity includes provider/version, organization, project, Ads
customer, manager account, Google account and grant owner, connection revision, all query fields and
page token. Successful empty pages are cached as well. The existing research
TTL is 24 hours; these are cached query snapshots, not a permanent keyword
corpus. Browser history uses the existing local history store with a separate
Google/project key and retains the full first-page request. It contains no
credentials or result rows.

Common metric fields conform to `KeywordResearchRow`. Google-specific metadata
adds account currency and close variants. Average CPC is converted from micros
in the account's currency; top-of-page bid ranges are not used as CPC.
Competition index becomes the existing 0–1 advertising-competition ratio.
SEO difficulty stays null and intent stays unknown. Unreported metrics remain
null; missing monthly values are omitted, while reported zero remains zero.
Close variants are preserved alongside their canonical row, not expanded into
independent rows carrying duplicated volume.

Google results use separate SQL tables rather than the DataForSEO metric table:

- `google_keyword_scopes`: project, Ads customer, language, network,
  adult-keyword setting and account currency.
- `google_keyword_scope_locations`: the locations belonging to each scope.
- `google_keyword_metrics`: the latest metrics for each scope and keyword.
- `google_keyword_monthly_volumes`: reported monthly volumes for a metric.
- `google_keyword_close_variants`: variants associated with the canonical keyword.

Scope identity includes the complete, unordered set of Google location IDs.
A multi-location total is never copied into individual country records. Seeds,
page size and page token do not create separate metric identities. Different
projects, customers, currencies and targeting settings cannot overwrite each other.

Both fresh pages and valid cached pages await an atomic SQL upsert before
returning successfully. An older `fetchedAt` cannot replace newer metrics or
their related rows. Zero remains zero, missing metrics remain null, and a newer
response replaces its monthly volumes and variants. A persistence error is
returned to the caller; there is no background write or silent success.
The batch transports values as bound JSON for SQL expansion, but the stored
model is relational. This keeps large pages within D1 statement/parameter limits.

Only requested pages are persisted. These are latest values, not an immutable
history of searches or raw Google API responses. Project deletion cascades to
these records; disconnecting an Ads grant does not erase collected project data.
Shared saved-keyword actions and classification relations remain separate work.
The OAuth connection has matching SQLite/Postgres migrations. Tokens remain encrypted in the existing account table; google_ads_connections stores only the project-to-customer mapping.

## Keyword dimension card

The Google results page includes a dimension card between the search controls
and result table. Its scope is the complete current result page, before table
filters; it does not fetch other pages. Generation uses these result keywords
directly and infers their subject without a separate industry input. An operator
explicitly requests generation or adds fields manually. Dimensions
use the existing line tabs; subdimensions use editable badge buttons. Existing
form dialogs support adding, renaming and deleting names. Regeneration requires
confirmation before replacing edits, and a failed request retains the draft.

`generateKeywordDimensions` uses project authorization and the shared connection
under **Settings → Integrations → AI providers → Vercel AI Gateway**. The dimension
card selects the model per request and initially uses `deepseek/deepseek-v4.1-flash`.
The same encrypted Gateway API key serves text generation and typed decisions.
Only integration managers can change connections. Revision checks prevent stale
updates; project/organization scoping and matching SQLite/Postgres schemas protect
stored credentials. Summaries never return the key.

The service resolves a Cordis-registered dimension agent, whose model comes from
the separate Cordis model-provider registry. The installed implementation uses
AI SDK `ToolLoopAgent` with an internal `submit_keyword_dimensions` tool and a
16,000-token output budget, including reasoning. Submission ends the single
model step; no extra explanation call or automatic repair follows it. SAM exposes
the same service through a project-bound internal tool. See the
[agent and provider contracts](decision-service.md#cordis-model-and-agent-assembly).

The Gateway provider uses the AI SDK transport and pins routing to
`only: ["deepseek"]`, with an empty model fallback list and SDK retries disabled.
Only DeepSeek model IDs are accepted. It never reads a deployment OpenRouter key,
changes models, or switches inference providers. Callers cannot supply credentials
or endpoint URLs; the service resolves the saved Gateway connection.
Each project pays Gateway directly through its own key, as with the decision
service; these calls do not consume the app's shared research-credit pool.
Authentication, budget/credit and rate-limit failures have actionable messages;
provider bodies and credentials are not exposed to clients or logs.

Output contains
only dimension and subdimension names, with no fixed industry template or
field quota. Invalid, duplicate, missing-tool or incomplete output is rejected;
output exhaustion has a separate error. No Jev
classification is triggered by this card.

This first card stores its editable draft in the current result component.
It is not yet saved to SQL and is cleared when leaving/replacing that result
or refreshing the page. Its React identity includes project, request and fetch
time, so delayed generation for an earlier result cannot populate a new one.
Durable research sets and classification remain subsequent work.

## Jev boundary

The result contract reserves classification execution state. Newly collected
keywords have `status: not_requested`. A future scored result identifies Jev,
model version, taxonomy version and prompt version, with multiple candidate
group IDs and individual scores. A candidate score is not an accepted
membership or a calibrated confidence. No threshold is embedded in the schema.

Reference discussions and the experiment were reviewed, including the later
facet-based grouping design. No Python process, demo dataset, taxonomy,
prompts, credentials or algorithm was imported. Group identity must remain
separate from representative keywords. Multiple dimensions can overlap;
unexecuted classification is not a negative label.

The shared [decision service](decision-service.md) now provides direct TypeSafe
Jev and configurable SystemOne calls, with project settings and an explicit test
action. Keyword research does not automatically invoke classification. The
following remain for discussion:

- User-defined dimensions, labels, task context and prompt/version ownership.
- Classification budgets and metering, and whether an additional gateway is needed.
- Optional quality sampling and storage as normalized relations; no mandatory
  per-keyword human review queue.
- Threshold calibration, incomplete/failed decisions, incremental runs and
  cancellation.
- Group browsing, intersections, representative keywords, optional embeddings,
  and the relationship to the shared saved-keyword collection.

## Google Ads connection

The Google Ads tab and Project settings → Integrations use the existing Google
connection card: authorize a Google account, select an advertising account,
change that selection, disconnect the project, or remove a personal grant.
Google Ads has its own `google-ads` OAuth provider and `adwords` scope. GA4,
Search Console, and Google sign-in grants remain separate.

The operator reuses `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`BETTER_AUTH_SECRET`. Enable Google Ads API in the OAuth client's Cloud project,
obtain the appropriate API access level, and register this exact redirect URI:

```
https://YOUR_HOST/api/google-ads/oauth/callback
```

For Orca this is `https://orca.x-whale.com/api/google-ads/oauth/callback`.
Google Ads API access is managed in Google Cloud; developer tokens were sunset
on September 9, 2026. An OAuth grant alone does not grant API production access.
The application calls only account discovery and keyword research endpoints;
Google does not offer a narrower read-only Ads OAuth scope.

ListAccessibleCustomers discovers directly accessible roots. For each root,
customer_client queries discover enabled advertising accounts, including clients
of managers. The picker retains each customer/manager access route explicitly.
Saving verifies the current user's grant and freshly re-discovers the selected
route. A project member with integration-management permission can change the
mapping; ordinary project members can research through its connector's grant.
Discovery errors appear as unavailable/reconnect states, never valid empty lists.

The initial service-account environment adapter is replaced by the explicitly
selected OAuth flow. There is no automatic credential/provider fallback.
Hosted mode remains unavailable until a hosted access/quota policy is agreed.
Disconnecting deletes the project mapping; removing a personal Google Ads grant
atomically deletes its dependent mappings, including other workspaces. Tokens
stay server-side and encrypted by the shared Google OAuth implementation.

A new selection changes the connection revision. Browser and R2 cache identities
include that revision; cached results still require a current binding and valid
grant. The UI drops old results on connection changes.

Targeting selectors load country and language constants from Google Ads using the
project connection. Location search uses SuggestGeoTargetConstants for countries,
regions, and cities; up to ten locations can be selected. Name lookup also resolves
IDs from existing search history, including cities. Requests, cache identities, and
saved history retain Google IDs; translated labels are display-only. Failed lookups
show an explicit retry state. No default market or language is selected.
Jev classification remains separate work.

References:

- [Google keyword ideas](https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas)
- [Google OAuth](https://developers.google.com/google-ads/api/docs/oauth/overview)
- [Accessible accounts](https://developers.google.com/google-ads/api/docs/account-management/listing-accounts)
- [Developer-token sunset](https://developers.google.com/google-ads/api/docs/api-policy/developer-token)
- [TypeSafe API](https://docs.typesafe.ai/api/system-one)
