# Decision service

Each project configures provider connections under **Settings → Integrations → AI providers**. Each provider has its own encrypted credential, endpoint and timeout in `ai_provider_configs`, keyed by project and provider. Integration managers can save or remove connections; project members can use them.

Vercel AI Gateway has one connection shared by text generation and typed decisions. Models are request parameters, not credentials or separate integrations. Text generation defaults to `deepseek/deepseek-v4.1-flash`; Gateway decisions default to `typesafe-ai/jev`. The dimension card and decision test expose model selection where the request is made. See the [dimension card contract](google-keyword-provider.md#keyword-dimension-card).

The previous task-specific configuration tables remain as historical schema artifacts and are not read by the application. They were empty in this development deployment when the provider connection table was introduced. Credentials are not implicitly copied or selected between old configurations.

## Gateway model catalog

The Gateway connection includes a searchable catalog with separate text and decision tabs. The `vercel-gateway` catalog implementation reads the public `https://ai-gateway.vercel.sh/v1/models` endpoint without sending credentials or running inference. The authenticated project server function exposes only normalized catalog metadata. The client caches successful results for five minutes and offers an explicit refresh; failed requests show an error without substituting a static list.

The catalog's `language` and `evaluation` types determine the tabs. `owned_by` identifies the model creator, not the inference provider. Prices are converted from USD per token into reference prices per million tokens; missing prices remain unknown rather than free. These reference prices may differ from the rate of a pinned inference provider. Missing policy or release metadata is also left unknown. Browsing or copying a model ID does not change call-site defaults, supported models, credentials, or the existing DeepSeek-only text routing policy.

The AI client plugin also owns a searchable model picker exposed to other domains
through `aiSettings.ModelPicker`. Settings, decision tests and dimension generation
share the same project-scoped catalog query. Decision tests select native
`evaluation` models, including `openai/gpt-6-luna-decisions`; the dimension picker
selects `language` models allowed by its existing DeepSeek policy. Search matches
model ID, name and creator. Typing filters choices without changing the selected
model or starting inference. Local and direct TypeSafe connections retain their
explicit model-name field because they do not have this Gateway catalog.

## OpenAI decisions through Gateway

Select **Vercel AI Gateway → Test decision → openai/gpt-6-luna-decisions**. Keep
Orca's saved Gateway API key; the OpenAI key is managed in Gateway's BYOK settings.
The default remains Jev. No separate OpenAI connection or SDK is installed.

The Gateway plugin sends the existing `state` and `questions` to
`/typesafe/v1/systemone`. Gateway adapts OpenAI's native Decisions API to the
existing `noul`, `choice`, `score`, confidence, legend and usage response shape.
Orca validates those native outputs without generating distributions with a chat
model. `openai/gpt-6-luna` is a text model and is rejected for this decision path;
the supported native ID is `openai/gpt-6-luna-decisions`.

OpenAI decisions send `providerOptions.gateway: { only: ["openai"], models: [] }`.
There is one application inference request, no application retry, no model
fallback and no alternate serving provider. The project's authorization,
encrypted credential, revision check, timeout, cancellation and sanitized errors
are shared with the existing decision transport.

Gateway may use system credentials if the dashboard's OpenAI BYOK credential
fails, charging Gateway credits. The maintainer explicitly accepted this existing
Gateway credential policy. `only: ["openai"]` does not disable it; successful
inference alone does not prove which credential funded the request. Credential
source is verified in Gateway Logs.

## Cordis model and agent assembly

The server manifest installs `ctx.ai` for provider configuration, model capabilities and typed decisions. The `vercel-gateway` plugin registers text inference, model discovery and Gateway SystemOne decisions; `systemone` registers direct TypeSafe and custom SystemOne decisions. Registrations follow the contributing plugin's lifetime. Missing or failed providers are errors, never a request to select another registered provider.

The model registry is stateless. Each call supplies its authenticated project and
organization plus the chosen model ID. Credentials resolve from that project's
connection for the request and are never stored on the shared Cordis context.
The Gateway adapter owns the request timeout, credential revision guard, redirect
policy, error sanitization, and DeepSeek-only routing for both generated and
streamed text. Callers cannot override that inference-provider restriction.

The `keywords` domain owns dimension generation, its prompt, output validation and the internal SAM tool. There is no separate dimension-agent registry. The domain calls the installed AI service with its authorized project/organization scope and the selected model.
Its AI SDK `ToolLoopAgent` has a terminal `submit_keyword_dimensions` tool, a
16,000-token output budget shared with reasoning, and one model step. DeepSeek
thinking uses automatic tool choice; exactly one valid submission is required.
Truncated, duplicate, prose-only, or invalid submissions fail explicitly. There
is no second attempt, JSON repair, or alternate provider.

SAM retains Think for session persistence, streaming, tools and context compaction.
Its model hook is a lazy adapter to `ctx.ai`; it resolves credentials only
when inference starts. Chat and compaction use the same project connection and
default text model. `generate_keyword_dimensions` is an internal SAM tool bound
to the session's project and organization, reusing the authorized dimension
service. It returns canonical English names plus Chinese display labels, without
saving or replacing a page's editable draft. Separate `list_keyword_searches` and `get_keyword_dimensions` tools read the
persisted search taxonomy shared with the UI, including active/inactive switches. The planned keyword classifier must filter inactive
subdimensions before calling `ctx.ai.decide`, using English names and stable
field IDs; see the [Jev boundary](google-keyword-provider.md#jev-boundary).
The provider catalog does not replace Think's session runtime.

SAM's model requests are paid by the saved project Gateway key. They do not also
deduct platform research credits. Existing research-tool billing and hosted
tool-credit/access gates remain in place. Model telemetry records Gateway's
reported cost; absent cost metadata stays unknown. Automatic recovery inference
remains disabled. Other research features that use OpenRouter are separate from
SAM and are unchanged by this assembly.

## Connection options

| Service                   | Service URL                                                  | Model name                                                 |
| ------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| TypeSafe Jev              | `https://api.typesafe.ai/v1/systemone` (fixed)               | `jev-latest`, or an available explicit model name          |
| Vercel AI Gateway         | `https://ai-gateway.vercel.sh/typesafe/v1/systemone` (fixed) | `typesafe-ai/jev`, or another compatible decision model ID |
| Local Laya                | e.g. `http://127.0.0.1:8765/v1/systemone`                    | `english`, `multilingual`, or `typed-decisions`            |
| Strands Decider           | e.g. `http://127.0.0.1:8099/v1/systemone`                    | Name/checkpoint served by that process                     |
| Cloudflare Clef on SGLang | e.g. `http://127.0.0.1:30000/v1/systemone`                   | `Cloudflare/clef`                                          |

Select **TypeSafe** for its hosted API, **Vercel AI Gateway** to call a decision model through the gateway, or **Custom service** for a server implementing the text SystemOne contract. This is not an OpenAI chat-completions client; pointing it at an ordinary Ollama or `/v1/chat/completions` endpoint will not work.

AI Gateway uses its TypeSafe-compatible HTTP API and requires an **AI Gateway API key**, not a TypeSafe key or Vercel account access token. Its default model is `typesafe-ai/jev`; gateway model IDs use a provider prefix, unlike direct TypeSafe model names. Requests are billed through the gateway. Orca sends only the selected model and does not configure gateway decision fallbacks or alternate models. Gateway configuration uses the same encrypted storage, test action and unified call contract as the other services.

A custom service URL is the full inference endpoint, including `/v1/systemone`. Gateway stores its fixed origin, and each caller uses the appropriate SDK or SystemOne path. It is fetched by the Orca backend, so `localhost` means the backend host, not the user's browser. A deployed Cloudflare Worker cannot reach a model on a user's laptop by its loopback address. Use a reachable HTTPS inference endpoint for that arrangement.

Jev and AI Gateway require an API key. A custom server may use a Bearer key or explicitly use no key. Keys are encrypted with `BETTER_AUTH_SECRET`, never returned to the client, and never transferred to a changed service when “keep saved key” is selected. Replacing or clearing the credential is an explicit configuration action. Concurrent edits use a revision check so a stale form cannot overwrite newer settings.

The self-host backend allows explicitly configured loopback/private IP addresses. Other addresses require HTTPS and the existing public URL policy. Hosted mode additionally requires the operator to list exact custom endpoint origins in `DECISION_ALLOWED_ORIGINS`, comma-separated; it does not allow loopback/private targets. Redirects, URL credentials, query strings and fragments are rejected. No new dependency or model weight is included in Orca.

## Unified call contract

App clients call the authenticated TanStack server function:

```ts
import { runDecision } from "@/serverFunctions/decision";

const result = await runDecision({
  data: {
    projectId,
    selection: { provider: "vercel_gateway", model: "typesafe-ai/jev" },
    input: {
      state: { keyword: "buy coffee beans" },
      questions: {
        intent: {
          type: "choice",
          instructions: "Classify the search intent.",
          criteria: {
            purchase: "The person wants to buy a product.",
            research: "The person wants to learn about a topic.",
          },
        },
        commercial: {
          type: "noul",
          instructions: "Does this keyword express commercial intent?",
        },
        urgency: {
          type: "score",
          instructions: "Rate the urgency of the purchase.",
          criteria: ["No urgency", "Immediate purchase"],
        },
      },
    },
  },
});
```

Server-side features call `DecisionService.decide(input, { organizationId, projectId }, { provider, model })` with authenticated scope. The repository checks both organization and project. Request data selects a provider and model, but cannot supply a URL or credential. The connection is always loaded from that project’s saved provider configuration. An omitted selection uses Gateway and Jev; it does not search other configured providers if that connection is missing.

The shared text subset supports string/object/array state, named questions, string instructions and criteria, 2–255 choice options, 2–10 ordered score levels, and up to 32 questions. Input is bounded to 64,000 serialized characters. Images and box questions are not part of this first interface.

Results retain the provider's `answers`, reported `model`, optional `usage`, and add `provider`, `requestedModel`, `configRevision`, and `durationMs`. A `noul` answer is a probability of true, not a Boolean. A score is the expected value on the caller's zero-based rubric, not a normalized probability. Choice probabilities and confidence are distinct provider values. No thresholds, re-normalization, taxonomy, or action policy is applied. Missing usage stays absent rather than being reported as free usage.

Response validation checks every question and its type, exact option/level keys, score bounds, legend, probability ranges and approximate distribution sums. Reported input truncation is rejected. Provider bodies and transport errors are never passed through to users or logs. Each call makes exactly one inference request: no retries, fallback models, generated substitute answers, or automatic provider switches. The service does not cache or persist prompts/answers; only configuration is stored. Future classification persistence belongs to its own normalized domain tables.

## Local model notes

Laya's official server exposes `/v1/systemone`. Pin an explicit checkpoint (`english`, `multilingual`, or `typed-decisions`) rather than an automatic routing alias. Its response can include routing and truncation metadata; Orca returns the common decision fields and rejects reported truncation. Model accuracy still needs evaluation on the intended task.

Strands serves the same text request/response shape, but its maintainers do not claim full Jev compatibility. Start it with `--strict-window` so oversized inputs fail instead of being shortened internally:

```sh
strands-decider serve StrandsAgents/strands-decider-2B-qwen3.5-v1-2610 \
  --device mps --port 8099 --strict-window
```

Set the model name to the checkpoint served by the process. The Strands server identifies its loaded checkpoint in responses; the requested name is not a mechanism to load another checkpoint. Clef requires its documented SystemOne-capable SGLang deployment. Neither model is installed by configuring Orca.

## Source contracts

- [TypeSafe System One API](https://docs.typesafe.ai/api/system-one)
- [Vercel AI Gateway TypeSafe-compatible API](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe)
- [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions)
- [Gateway decision models and compatibility](https://vercel.com/docs/ai-gateway/modalities/decision)
- [Gateway BYOK credential behavior](https://vercel.com/docs/ai-gateway/authentication-and-byok/byok)
- [Laya model card and HTTP serving](https://huggingface.co/convaiinnovations/laya#self-hosting-jev-compatible-http-server)
- [Strands inference and serving](https://github.com/strands-labs/strands-decider/blob/main/docs/inference.md)
- [Strands response schemas](https://github.com/strands-labs/strands-decider/blob/main/src/strands_decider/schema.py)
- [Clef model card and SystemOne serving](https://huggingface.co/Cloudflare/clef)

## Credential management and security boundaries

Provider settings reuse the app's key table, row actions and dialogs. Each provider
still has one active connection/key per project. Adding or replacing a key requires
a name and a newly entered secret; renaming and connection edits keep the encrypted
secret. The metadata columns store its name, a four-character suffix (only for keys
longer than eight characters), the time it was added to Orca, and its last request
attempt. Historical timestamps and suffixes are left unknown for pre-existing keys.
A revision guard prevents a stale request from updating a newly replaced credential.
Removing a key from Orca does not revoke the provider's key or recall an in-flight
request. Provider-side expiration, revocation and spend budgets remain managed there.

Secrets are encrypted with Better Auth's XChaCha20-Poly1305 using a key derived from
`BETTER_AUTH_SECRET`. Provider summaries never decrypt or return the stored key.
The secret-entry dialog calls the server function directly, bypassing Query mutation
variables, and clears the field after submission. Replay network sanitization drops
all request/response bodies and headers even if remote PostHog settings enable them.
The existing replay input masking also applies to the password field.

Every entry point uses authentication and organization/project checks; configuration
mutations require integration-management permission. Start's CSRF middleware covers
server functions. Fixed cloud destinations cannot be replaced, redirects are rejected
for both decision and text generation calls, and upstream bodies are not forwarded
in error messages. No real key is sent during automated tests.

These controls are not a full secrets-management or spend-control system. Encryption
uses the deployment auth secret rather than a separate KMS, and there is no per-user
inference quota, application spend cap or full credential audit trail. Self-host
administrators may explicitly configure private/local endpoints. Public custom-host
DNS screening still uses the existing best-effort crawl policy: DNS failure can
permit a request, and resolution is not pinned to the subsequent connection. This
behavior was retained at the maintainer's request; network egress isolation is still
needed for stronger protection. Hosted custom destinations additionally require an
operator-managed origin allowlist. Ordinary project members can run research using
the saved connection, but cannot change it or read its full secret.

References: [Vercel API key management](https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys)
and [Gateway key and budget commands](https://vercel.com/docs/cli/ai-gateway).
