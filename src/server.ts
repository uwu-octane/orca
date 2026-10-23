import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { routeAgentRequest } from "agents";
import { runScheduledRankChecks } from "@/server/features/rank-tracking/services/scheduledRankChecks";
import { SCHEDULED_RANK_CHECKS_PAUSED } from "@/shared/rank-tracking-pause";
import { reconcileStaleAudits } from "@/server/features/audit/services/auditReconciler";
import { getAuthMode, isHostedAuthMode } from "@/lib/auth-mode";
import {
  createOpenSeoOAuthProvider,
  type OpenSeoOAuthEnv,
} from "@/server/mcp/oauth-provider";
import { requestWithPublicOrigin } from "@/server/mcp/public-origin";
import { MCP_ROUTE } from "@/server/mcp/context";
import { withPgClient } from "@/db";
import {
  AUTUMN_WEBHOOK_PATH,
  handleAutumnWebhookRequest,
} from "@/server/billing/autumn-webhook";
import { sweepDubReferredOrganizations } from "@/server/referrals/dub";
import { maybeSendSelfHostHeartbeat } from "@/server/lib/self-host-telemetry";
import { handleGdprStorageErasure } from "@/server/gdpr/storage-erasure";
import { GDPR_STORAGE_ERASURE_PATH } from "@/shared/gdpr-erasure";
// FORK: cordis plugin layer — boot the server plugin tree (lazy singleton).
import { getAppContext, getSam } from "@/plugins/server/context";

const startHandler = createStartHandler(defaultStreamHandler);

// The app ships no security response headers of its own, so any third-party
// page can frame an app route and UI-redress a one-click action (delete a
// project, change project settings, buy credits). `frame-ancestors 'self'` on
// the app's own documents is the whole fix, and deliberately all of it: a
// script-src policy would need a nonce for the inline bootstrap script in
// __root.tsx plus allowances for Turnstile and PostHog, which is separate,
// larger work.
//
// Only HTML documents, and only ones that carry no policy of their own, so a
// route that sets its own stricter CSP keeps it (two CSP headers intersect, so
// adding a second could only confuse things). Wrapping the handler rather than
// one call site covers the OAuth-provider path too, which serves app documents
// through this same function.
async function appFetch(request: Request): Promise<Response> {
  const response = await startHandler(request);
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.startsWith("text/html") ||
    response.headers.has("content-security-policy")
  ) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const openSeoOAuthProvider = createOpenSeoOAuthProvider(appFetch);

// The chat DO lives behind /agents/*. Dispatch on the DO binding partyserver
// resolved for the request (rather than re-parsing the path), and fail closed
// on anything unrecognized.
async function authorizeChatAgent(
  request: Request,
  lobby: { className: string; name: string },
): Promise<Response | undefined> {
  if (lobby.className === "SAM_CHAT") {
    return (await getSam()).sessions.authorizeConnection(request, lobby.name);
  }
  return new Response("Forbidden", { status: 403 });
}

// Route /agents/* to the SAM chat DO. Auth happens here (both the WS upgrade
// and any HTTP message-history fetch), keeping it off the OAuth wrapper and
// TanStack route guard below.
async function routeChatAgents(request: Request, env: Env): Promise<Response> {
  const response = await routeAgentRequest(request, env, {
    onBeforeConnect: (req, lobby) => authorizeChatAgent(req, lobby),
    onBeforeRequest: (req, lobby) => authorizeChatAgent(req, lobby),
  });
  return response ?? new Response("Not found", { status: 404 });
}

function fetch(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // Scope a per-request Postgres client (no-op in D1 mode). The client isn't
  // closed here — the Workers↔Hyperdrive socket is reclaimed at invocation end.
  return withPgClient(() => Promise.resolve(handleFetch(request, env, ctx)));
}

async function handleFetch(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // FORK: boot the plugin tree before handling (memoized; no-op once settled).
  await getAppContext();

  const authMode = getAuthMode(env.AUTH_MODE);
  const publicRequest = requestWithPublicOrigin(request);
  const pathname = new URL(publicRequest.url).pathname;
  ctx.waitUntil(maybeSendSelfHostHeartbeat(pathname));

  if (pathname === "/api/ai-visibility/download") {
    return import("@/server/features/ai-visibility/services/aiVisibilityExport").then(
      ({ handleAiVisibilityDownload }) =>
        handleAiVisibilityDownload(publicRequest),
    );
  }

  if (pathname === GDPR_STORAGE_ERASURE_PATH) {
    return handleGdprStorageErasure(publicRequest, env);
  }

  if (pathname.startsWith("/agents/")) {
    return routeChatAgents(publicRequest, env);
  }

  if (isHostedAuthMode(authMode)) {
    if (pathname === AUTUMN_WEBHOOK_PATH) {
      return handleAutumnWebhookRequest(publicRequest);
    }

    return openSeoOAuthProvider.fetch(
      publicRequest,
      env as OpenSeoOAuthEnv,
      ctx,
    );
  }

  if (
    (authMode === "cloudflare_access" || authMode === "local_noauth") &&
    pathname === MCP_ROUTE
  ) {
    return import("@/server/mcp/transport").then(
      ({ handleSelfHostedOpenSeoMcpRequest }) =>
        handleSelfHostedOpenSeoMcpRequest(publicRequest, authMode, env, ctx),
    );
  }

  return appFetch(request);
}

// Export Workflow classes as named exports. SiteAuditWorkflow and the
// AuditScratchpad DO live in the open-seo-audit aux worker
// (src/audit-worker.ts); this worker reaches them via cross-script bindings.
export { RankCheckWorkflow } from "./server/workflows/RankCheckWorkflow";
export { AiVisibilityWorkflow } from "./server/workflows/AiVisibilityWorkflow";
// Durable Object class for the SAM in-app agent (Agents SDK).
export { SamChatAgent } from "./plugins/sam/platform";

// Daily OAuth KV garbage collection; must match a trigger in wrangler.jsonc.
const MCP_OAUTH_PURGE_CRON = "17 3 * * *";

export default {
  fetch,
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ) {
    if (controller.cron === MCP_OAUTH_PURGE_CRON) {
      // Only hosted mode runs the OAuth provider (and has OAUTH_KV bound).
      if (isHostedAuthMode(getAuthMode(env.AUTH_MODE))) {
        const result = await openSeoOAuthProvider.purgeExpiredData(
          env as OpenSeoOAuthEnv,
        );
        console.log("[mcp-oauth] purged expired OAuth data", result);
        if (!result.done) {
          // The sweep only advances past live records via deletions; a
          // persistent incomplete scan means the keyspace outgrew the batch.
          console.warn("[mcp-oauth] purge did not cover the full keyspace");
        }

        // Daily referral-sale sweep: catches paid Autumn invoices the
        // billing.updated webhook path misses (renewals, one-time top-ups).
        try {
          await sweepDubReferredOrganizations();
        } catch (err) {
          console.error("[cron] Dub referral sale sweep failed:", err);
        }
      }
      return;
    }

    // Watchdog first: reconcile audits stuck in "running" whose workflow died
    // without reaching mark-failed (OOM/CPU kills, expired instances). Runs
    // before the rank loop so a slow tick can't delay or starve it. Its
    // failure is held until after the rank checks so it can't suppress them,
    // then rethrown so the invocation still reports as failed.
    let watchdogError: unknown;
    try {
      await withPgClient(() => reconcileStaleAudits());
    } catch (err) {
      watchdogError = err;
      console.error("[cron] Stale-audit reconcile failed:", err);
    }
    // Scope a per-request Postgres client for the cron run (no-op in D1 mode).
    const checks = await Promise.allSettled([
      SCHEDULED_RANK_CHECKS_PAUSED && isHostedAuthMode(env.AUTH_MODE)
        ? Promise.resolve()
        : withPgClient(() => runScheduledRankChecks(env)),
      withPgClient(async () => {
        const { runScheduledAiVisibility } =
          await import("@/server/features/ai-visibility/services/scheduledAiVisibility");
        await runScheduledAiVisibility();
      }),
    ]);
    for (const result of checks)
      if (result.status === "rejected") throw result.reason;
    if (watchdogError) throw watchdogError;
  },
};
