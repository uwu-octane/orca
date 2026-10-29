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
The Keywords domain injects the verified project ID, then uses the
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
use the existing line tabs, with a pencil icon for editing. Subdimension pills
toggle `active` on click; their separate pencil buttons open editing without
changing activation. New and generated subdimensions start active. Renaming and
switching tabs preserve IDs and activation. Existing form dialogs support adding,
editing and deleting English names and Chinese display names. Regeneration requires
confirmation before replacing edits, and a failed request retains the draft.

`generateKeywordDimensions` uses project authorization and the shared connection
under **Settings → Integrations → AI providers → Vercel AI Gateway**. The dimension
card selects the model per request and initially uses `deepseek/deepseek-v4.1-flash`.
The same encrypted Gateway API key serves text generation and typed decisions.
Only integration managers can change connections. Revision checks prevent stale
updates; project/organization scoping and matching SQLite/Postgres schemas protect
stored credentials. Summaries never return the key.

The `keywords` Cordis service owns dimension generation and obtains its text
model from the installed `ai` service. Its implementation uses
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

Output contains only dimension and subdimension names: `name` is canonical
English and `labelZh` is its Simplified Chinese display translation. Generation
always produces both, independent of UI locale. Form validation shares the
generation schema; Chinese cannot replace the canonical name. English UI uses
`name`, Chinese UI uses `labelZh`. Original search keywords remain unchanged.
There is no fixed industry template or field quota. Invalid, duplicate,
missing-tool or incomplete output is rejected;
output exhaustion has a separate error. No Jev
classification is triggered by this card.

Search results now have immutable SQL snapshots in `google_keyword_searches`
with normalized seed, location, keyword, monthly-volume and variant rows. The
snapshot identity includes the scoped cache key and supplier fetch timestamp.
A cache hit returns the same search ID without touching its taxonomy; a newly
fetched page creates a different snapshot. Latest market metrics remain in their
existing tables. Empty pages are also stored.

`keyword_research_dimensions` and `keyword_research_subdimensions` belong to a
search snapshot, with explicit foreign keys, ordered positions, stable IDs,
English names, Chinese labels and child activation. Project deletion cascades
through both results and taxonomy. Reads and writes enforce project and
organization ownership, including archived-project exclusion.

The page URL carries `searchId`; reloads read SQL without running another Ads or
model request. The history list reads recent snapshots from the installed
Keywords service, so saved searches remain discoverable across browsers and
origins within the same authorized project. Saved searches can be opened even
after disconnecting Google Ads. Browser-only history entries are retained and
deduplicated against persisted searches; entries without a search ID retain
their explicit repeat-search action. Removing a browser-only entry never deletes
a saved snapshot or its taxonomy. History load failures display a retry action.

The Keywords Cordis service owns snapshot reads, taxonomy edits and persisted
generation. The generation endpoint reads the stored keywords by ID rather than
accepting a replacement keyword list from the client. Each edit or generation
uses the loaded revision. One transaction claims that revision and replaces the
normalized rows; stale writes cannot delete or replace newer edits. Generation
failures and transaction failures leave the previous version intact. The UI
updates its query cache only after a successful save; errors retain the edit
form and conflicts require an explicit reload. No automatic merging or retries.

SAM discovers the project's recent snapshots through `list_keyword_searches`
and reads `get_keyword_dimensions` by search ID. That tool returns the same
persisted taxonomy as the page, original keywords and a `decisionDimensions`
projection containing only active children with IDs and English names. These
are internal, lifecycle-owned Keywords contributions to SAM, not independent
storage or new public MCP tools. They can read saved data without Google or AI
supplier configuration. The existing `generate_keyword_dimensions` discovery
tool remains non-mutating; it does not silently replace an operator's edits.

## Jev boundary

The Google results table offers an explicit per-row intent action through the
Keywords service and `ctx.ai.decide`. Intent classification defaults to
`openai/gpt-6-luna-decisions` through Vercel AI Gateway;
the operation also accepts the shared decision selection contract. Google does
not supply intent. Unclassified cells stay blank; a choice decision uses the
existing informational, commercial, transactional, navigational and unknown
categories. Unknown is an explicit ambiguous-query outcome, not an error fallback.
Prompts and stored category IDs are English; labels use the locale plugin.

`google_keyword_search_intents` relates each decision to a saved search row and
stores the provider, actual model, prompt version and timestamp. Snapshot reads
include that same result. Already classified rows return it without another model
call. Writes recheck project ownership and preserve the first saved decision under
concurrent clicks. Concurrent requests that start before either write may both
invoke the provider. Failures leave the row unclassified; no automatic retries,
bulk inference, threshold, provider substitution or Google API call is added.

There is currently no dimension-based classification job. Neither dimension
generation nor pill activation invokes decisions. The persisted taxonomy,
revision and active-only English projection are available to SAM.

A future classification run must bind to a specific search ID and taxonomy
revision. Inactive children and dimensions with no active children are omitted
before inference; `labelZh` is never a decision criterion. Re-enabling a child
makes it eligible for a subsequent run, not a retroactive assignment. No active
children means no model call. An old result must not be presented as current
after its taxonomy revision changes.

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
