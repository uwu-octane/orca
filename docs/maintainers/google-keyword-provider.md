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

The existing SQL metric identity has no provider or currency dimension.
Google results therefore do not overwrite it. Shared saved-keyword actions,
permanent corpus storage, provider-aware metric observations and classification
relations require a separate design decision before they are connected.
The OAuth connection has matching SQLite/Postgres migrations. Tokens remain encrypted in the existing account table; google_ads_connections stores only the project-to-customer mapping.

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

There is no Jev network client or paid inference in this change. The following
remain for discussion:

- User-defined dimensions, labels, task context and prompt/version ownership.
- Direct TypeSafe API versus a gateway, authentication, budgets and metering.
- How classifications are reviewed and stored as normalized relations.
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
