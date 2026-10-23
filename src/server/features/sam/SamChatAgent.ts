// FORK: SAM uses project-scoped Cordis model providers and Gateway billing.
import { Think } from "@cloudflare/think";
import type {
  ChatErrorContext,
  ChatRecoveryContext,
  ChatRecoveryOptions,
  ChatResponseResult,
  SaveMessagesResult,
  Session,
  StepContext,
  ToolCallResultContext,
  TurnConfig,
  TurnContext,
} from "@cloudflare/think";
import { clearChatTerminal } from "agents/chat";
import { createCompactFunction } from "agents/experimental/memory/utils";
import { generateText } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, withPgClient } from "@/db";
import { user } from "@/db/schema";
import { staticAssistantModel } from "@/server/lib/chatAgent";
import { createSamModel, gatewayCostUsd } from "./samModel";
import { DEFAULT_LLM_MODEL, llmModelSchema } from "@/types/schemas/ai-provider";
import { AppError } from "@/server/lib/errors";
import { SamSessionRepository } from "@/server/features/sam/SamSessionRepository";
import { ProjectContextService } from "@/server/features/project-context/services/ProjectContextService";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { buildSamSkillSource } from "@/server/features/sam/samSkills";
import { buildSamSystemPrompt } from "@/server/features/sam/samSystemPrompt";
import { SamTelemetry } from "@/server/features/sam/samTurnTelemetry";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { checkUsageCreditsDepleted } from "@/server/billing/subscription";
import { getPublicOrigin } from "@/server/mcp/public-origin";
import { MCP_SCOPE } from "@/lib/oauth-resource";
import { AuthRepository } from "@/server/auth/repositories/AuthRepository";
import type { ToolAuthContext } from "@/server/mcp/context";

// SAM's read-only view of the project's shared memory. The block has no `set`
// provider, so Think exposes no set_context tool for it; writes go through the
// update_project_context tool, the same one MCP clients and the settings UI use.
const PROJECT_CONTEXT_BLOCK = "project_context";

const PUBLIC_ORIGIN_KEY = "sam-public-origin";

// Long tool-heavy turns are what outgrow the Durable Object memory limit; the
// model's 1M-token window never gets a say. Compact between turns past this
// estimated token count, and mid-turn once a step's input passes 90% of the
// proactive ceiling — both far below the window, because the constraint is DO
// memory, not the provider.
//
// The between-turn threshold is compared against the Session's built-in
// estimate (~4 chars/token over the full stored transcript). That runs high
// relative to what the model receives, because Think clips tool outputs
// older than the last four messages to 500 chars on every call, so it fires
// early — the safe side. Don't pass a tokenCounter built on the model's
// reported usage: the Session also calls the counter per single message when
// choosing what to protect, and a whole-prompt number collapses the protected
// tail to two messages. A real per-message counter means a tokenizer in the
// bundle, which costs the same heap we're protecting.
const SAM_COMPACT_AFTER_TOKENS = 120_000;
const SAM_MAX_INPUT_TOKENS = 160_000;

const INTERRUPTED_TURN_NOTICE =
  "That reply was cut off before it finished — the work got too big to complete in one go. Everything above is saved. Ask again for a narrower slice (fewer keywords, competitors, or pages), or tell me where to pick up.";

// Derive a short session title from the first user message.
function deriveTitle(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "New chat";
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}

function firstUserText(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  const textPart = firstUser?.parts.find((part) => part.type === "text");
  return textPart?.text ?? "";
}

type SamContext = {
  row: NonNullable<
    Awaited<ReturnType<typeof SamSessionRepository.getSessionById>>
  >;
  project: NonNullable<
    Awaited<ReturnType<typeof ProjectRepository.getProjectById>>
  >;
  // The session row is normalized (project/user ids only); the creating
  // user's current email is resolved here for the billing/MCP auth context.
  userEmail: string;
};

/**
 * Durable Object backing the SAM in-app agent, built on Think. One DO per chat
 * session (Think hosts one conversation per instance); the DO instance name IS
 * the session id, set by the client (`useAgent({ name: sessionId })`) and
 * authorized in the Worker (`onBeforeConnect`) before any connection reaches
 * here — so the DO trusts that its caller may act on `this.name` and derives
 * project/user from the sam_sessions row (and the org from the project).
 *
 * Think owns the agentic loop (streaming, persistence, compaction-ready
 * history, context blocks); this subclass contributes the model, the MCP
 * toolset, the tool credit gate, and project-scoped memory: the
 * "project_context" block renders the project's shared memory, which every
 * session in the project — and the MCP server and settings UI — reads and
 * writes through ProjectContextService.
 */
export class SamChatAgent extends Think {
  // SAM's toolset is the MCP tools from beforeTurn; it has no use for Think's
  // workspace bash tool, whose just-bash dependency is stubbed out of the
  // bundle anyway (see vite.config.ts) to keep ~30 MB of eagerly-evaluated
  // source out of every isolate's baseline heap.
  override workspaceBash = false;

  // Session row + project, resolved once per DO lifetime (the binding is
  // immutable). Null until a turn/provider needs it — and left null when the
  // registry row is gone, which beforeTurn turns into a polite refusal.
  private samContext: SamContext | null = null;

  // Turn telemetry: armed in beforeTurn, fed by the step and tool hooks,
  // reported once as `sam:turn` when the turn ends by any route (response,
  // error, or a memory-limit kill surfacing as recovery).
  private readonly telemetry = new SamTelemetry(
    () => this.name,
    () => withPgClient(() => this.loadSamContext()),
    (promise) => this.ctx.waitUntil(promise),
  );

  // Mid-turn context guard, using the compaction configured in
  // configureSession (see SAM_MAX_INPUT_TOKENS). The reactive backstop is
  // deliberately off: it re-runs the whole turn from compacted history, which
  // would re-issue every tool call — a second site audit, a second DataForSEO
  // charge for the same research — on a classifier that is a regex over the
  // provider's error text. A turn that still overflows ends as an error the
  // user can retry.
  override contextOverflow = {
    proactive: { maxInputTokens: SAM_MAX_INPUT_TOKENS },
  };

  /** Permanently remove this session's transcript for an account erasure. */
  async destroyForErasure(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      socket.close(1000, "Account erased");
    }
    this.cancelAllChats();
    await this.waitUntilStable({ timeout: 5000 });
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  // Record the app origin for the deep links tools attach to responses,
  // derived from the requests this DO serves instead of env config. DO storage
  // (not an instance field) because the DO hibernates: a turn can arrive as a
  // WS message on a wake-up where fetch() never ran. Reads are served from
  // workerd's in-process cache and unchanged puts are deduped, so this costs
  // nothing per turn.
  async fetch(request: Request): Promise<Response> {
    await this.ctx.storage.put(PUBLIC_ORIGIN_KEY, getPublicOrigin(request));
    return super.fetch(request);
  }

  getModel() {
    return this.buildModel();
  }

  private buildModel(modelId = DEFAULT_LLM_MODEL) {
    return createSamModel(
      () =>
        withPgClient(async () => {
          const ctx = await this.loadSamContext();
          if (!ctx) throw new AppError("NOT_FOUND");
          return {
            projectId: ctx.project.id,
            organizationId: ctx.project.organizationId,
          };
        }),
      modelId,
    );
  }

  override getSkills() {
    return [buildSamSkillSource()];
  }

  override afterToolCall(ctx: ToolCallResultContext) {
    this.telemetry.toolCall(ctx);
  }

  configureSession(session: Session): Session {
    return session
      .withContext("soul", {
        provider: { get: () => this.buildSoulPrompt() },
      })
      .withContext(PROJECT_CONTEXT_BLOCK, {
        description:
          "This project's shared memory — sections, competitors, key pages and research log, the same records the user sees in the app. Change it with update_project_context.",
        provider: { get: () => this.renderProjectContext() },
      })
      .onCompaction(
        createCompactFunction({
          summarize: (prompt) => this.summarizeForCompaction(prompt),
        }),
      )
      .compactAfter(SAM_COMPACT_AFTER_TOKENS);
  }

  // Compaction uses the same project connection and provider policy as chat.
  private async summarizeForCompaction(prompt: string): Promise<string> {
    const result = await generateText({
      model: this.buildModel(),
      maxRetries: 0,
      maxOutputTokens: 16_000,
      prompt,
    });
    this.telemetry.spend(gatewayCostUsd(result.providerMetadata));
    this.telemetry.compaction();
    return result.text;
  }

  private async loadSamContext(): Promise<SamContext | null> {
    if (this.samContext) return this.samContext;
    const row = await SamSessionRepository.getSessionById(this.name);
    if (!row) return null;
    const project = await ProjectRepository.getProjectById(row.projectId);
    if (!project) return null;
    const [creator] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, row.userId))
      .limit(1);
    if (!creator) return null;
    this.samContext = { row, project, userEmail: creator.email };
    return this.samContext;
  }

  // The identity block. Runs through the context-block pipeline like the
  // project-memory block, so it re-renders (fresh project row, intake mode
  // on/off) whenever the prompt is refreshed.
  private buildSoulPrompt(): Promise<string> {
    return withPgClient(async () => {
      const ctx = await this.loadSamContext();
      if (!ctx) {
        return "You are SAM, the SEO agent inside OpenSEO. This chat session no longer exists; tell the user to start a new chat.";
      }
      const context = await ProjectContextService.getProjectContext(
        ctx.project.id,
      );
      return buildSamSystemPrompt(
        {
          projectId: ctx.project.id,
          projectName: ctx.project.name,
          domain: ctx.project.domain,
          locationCode: ctx.project.locationCode,
          languageCode: ctx.project.languageCode,
        },
        // Nothing recorded about the business yet: SAM runs its intake flow.
        { intakeMode: context.missingSections.includes("business_overview") },
      );
    });
  }

  // The project-memory block. Scopes its own Postgres client: providers are
  // invoked from Think's internals, so no ambient withPgClient scope can be
  // assumed (no-op in D1 mode).
  private renderProjectContext(): Promise<string | null> {
    return withPgClient(async () => {
      const ctx = await this.loadSamContext();
      if (!ctx) return null;
      return ProjectContextService.renderProjectContextMarkdown(
        await ProjectContextService.getProjectContext(ctx.project.id),
      );
    });
  }

  // Gates swap the model for one turn: the canned model streams the refusal
  // back through Think's normal pipeline (rendered and persisted like any
  // assistant message) without calling a provider, so a refusal is free even
  // when users script them. The old version made a real 200-token call, which
  // MiniMax M3 could spend entirely on reasoning tokens — leaving the user a
  // truncated chain-of-thought and no reply (issue #161).
  private refusalTurn(text: string): TurnConfig {
    return { model: staticAssistantModel(text) };
  }

  async beforeTurn(turnCtx: TurnContext): Promise<TurnConfig> {
    const turn = this.telemetry.beginTurn(turnCtx.continuation);
    return withPgClient(async (): Promise<TurnConfig> => {
      const ctx = await this.loadSamContext();
      if (!ctx) {
        turn.refusal = "no_session";
        return this.refusalTurn(
          "I couldn't find this chat session. Please start a new one.",
        );
      }

      // Hosted research tools still use the organization's credits. Model
      // calls use the project's own Gateway key and are never charged twice.
      const { organizationId } = ctx.project;
      const hosted = await isHostedServerAuthMode();
      if (hosted) {
        const { depleted } = await checkUsageCreditsDepleted({
          userId: ctx.row.userId,
          userEmail: ctx.userEmail,
          organizationId,
          projectId: ctx.project.id,
        });
        if (depleted) {
          turn.refusal = "credits";
          return this.refusalTurn(
            "You're out of credits. Upgrade your plan or buy more credits on the Billing page to keep using SAM.",
          );
        }
      }

      const baseUrl =
        (await this.ctx.storage.get<string>(PUBLIC_ORIGIN_KEY)) ??
        "https://app.openseo.so";
      // Delegated/self-host orgs have no member rows — implicit owner. In
      // hosted mode a missing member row means the user was removed from the
      // workspace; fail closed instead of letting the open socket keep
      // owner-level tools (WebSockets authorize at connect time only, so this
      // per-turn check is what actually revokes a removed member's chat).
      const membership = await AuthRepository.getMembership(
        ctx.row.userId,
        organizationId,
      );
      if (hosted && !membership) {
        turn.refusal = "no_access";
        return this.refusalTurn(
          "You no longer have access to this organization, so I can't continue this chat.",
        );
      }
      const authContext: ToolAuthContext = {
        userId: ctx.row.userId,
        userEmail: ctx.userEmail,
        organizationId,
        role: membership?.role ?? "owner",
        // SAM sessions belong to one project's workspace; org context is
        // fixed for the session, like an OAuth token's.
        orgScope: "pinned",
        baseUrl,
        clientId: null,
        scopes: [MCP_SCOPE],
      };

      // Loaded per turn, not at startup: the tool schemas are costly to build.
      const samTools = await import("@/server/features/sam/samChatTools");
      const selectedModel = llmModelSchema.parse(
        turnCtx.body?.model ?? DEFAULT_LLM_MODEL,
      );
      return {
        model: this.buildModel(selectedModel),
        maxRetries: 0,
        tools: samTools.buildSamMcpTools(authContext, ctx.project, turn.turnId),
        // Preserve the established tool-loop bounds. The Gateway adapter
        // enforces provider restrictions and the configured request timeout.
        maxSteps: 40,
        maxOutputTokens: 16_000,
      };
    });
  }

  onStepFinish(ctx: StepContext): void {
    const costUsd = gatewayCostUsd(ctx.providerMetadata);
    this.telemetry.spend(costUsd);
    this.telemetry.step(ctx, costUsd);
  }

  async onChatResponse(result: ChatResponseResult): Promise<void> {
    this.ctx.waitUntil(
      this.telemetry.report(
        result.status,
        { request_id: result.requestId, error_message: result.error },
        this.messages,
      ),
    );

    await withPgClient(async () => {
      const ctx = await this.loadSamContext();
      if (!ctx) return;

      // Name the session from its first message so the side-panel is readable.
      if (ctx.row.title === "New chat") {
        const title = deriveTitle(firstUserText(this.messages));
        if (title !== "New chat") {
          await SamSessionRepository.setTitle(ctx.row.id, title);
          ctx.row.title = title;
        }
      } else {
        await SamSessionRepository.touch(ctx.row.id);
      }
    });

    // Re-render the blocks so context written during this turn — or by another
    // session, the settings UI, or an MCP client — is in the prompt by the next
    // turn. One withPgClient scope covers both providers (their own defensive
    // scopes reuse it). Best-effort — never fail the response.
    if (result.status === "completed") {
      await withPgClient(() => this.session.refreshSystemPrompt()).catch(
        (error: unknown) => {
          console.error("[sam] context refresh failed", error);
        },
      );
    }
  }

  // The return value becomes the stored chat-terminal body that reconnecting
  // clients replay — returning nothing would make it the string "undefined".
  onChatError(error: unknown, ctx?: ChatErrorContext): unknown {
    console.error("[sam] chat turn error", ctx?.stage, error);
    this.telemetry.error(error, ctx, this.messages);
    return error;
  }

  // Think's chat recovery re-runs an interrupted turn: after a Durable Object
  // reset it wakes, reads the incident, and calls the model again to continue
  // the partial reply. When the reset was a memory-limit kill (a long,
  // tool-heavy turn under GPT-5.6 Luna at max reasoning), every re-run dies at
  // the same point, and the bookkeeping that bounds the retry budget dies with
  // it — one incident was observed at attempt 44 of a max of 10. Each attempt
  // is a full OpenRouter call that never reaches onChatResponse, so none of it
  // is metered: in early Sep 2026 these loops were ~95% of the key's spend.
  // Keep the durable bookkeeping (partial reply persisted) but never re-run
  // inference automatically; the user resends instead. Skipped recoveries
  // get no framework banner (that only fires when a retry budget is
  // exhausted), so schedule our own notice — delivered from inside this hook
  // it would land before the partial reply in the transcript.
  override async onChatRecovery(
    ctx: ChatRecoveryContext,
  ): Promise<ChatRecoveryOptions> {
    console.warn("[sam] interrupted turn not re-run", {
      name: this.name,
      incidentId: ctx.incidentId,
      recoveryKind: ctx.recoveryKind,
    });
    // The DO that ran the turn is gone with its stats; this is the only
    // signal that a turn was killed, so count it as its own status.
    await this.telemetry.report(
      "interrupted",
      { incident_id: ctx.incidentId, recovery_kind: ctx.recoveryKind },
      this.messages,
      { synthesize: true },
    );
    // Recovery runs from the DO's startup path, and a hook that fails or
    // times out is re-run on the next wake; idempotent so the notice is
    // scheduled once per incident, not once per restart.
    await this.schedule(1, "notifyInterruptedTurn", ctx.incidentId, {
      idempotent: true,
    });
    return { persist: true, continue: false };
  }

  async notifyInterruptedTurn(): Promise<void> {
    await this.deliverNotice(INTERRUPTED_TURN_NOTICE);
  }

  // Recovery continuations already queued as alarms before this deploy still
  // fire, and would each make one more model call (re-arming through the
  // alarm circuit breaker when that call OOMs too). Skip them without touching
  // the model; Think records the incident as skipped. Every other trigger
  // (auto-continuation, RPC, sub-agent) passes through untouched.
  protected override async continueLastTurn(
    ...args: Parameters<Think["continueLastTurn"]>
  ): Promise<SaveMessagesResult> {
    if (args[1]?.trigger === "recovery-continue") {
      console.warn("[sam] skipped queued recovery continuation", {
        name: this.name,
      });
      return { requestId: crypto.randomUUID(), status: "skipped" };
    }
    return super.continueLastTurn(...args);
  }

  // POST .../rewind {messageId}: delete that message and everything after it on
  // the active branch. Backs the client's undo (rewind past a user message) and
  // edit (rewind, then resend the edited text). Authorized in the Worker like
  // every other HTTP request to this DO. Think's own onRequest wrapper handles
  // /get-messages before delegating here.
  async onRequest(request: Request): Promise<Response> {
    if (
      request.method === "POST" &&
      new URL(request.url).pathname.endsWith("/rewind")
    ) {
      const body = z
        .object({ messageId: z.string().min(1) })
        .safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return Response.json({ error: "messageId required" }, { status: 400 });
      }
      const { messageId } = body.data;
      // A rewind can race an in-flight turn (the user undoes while the agent
      // is still working, e.g. after the stream stalled client-side). Abort
      // the turn and wait for it to settle BEFORE deleting, or its still-
      // running loop keeps streaming chunks and persists a fresh assistant
      // message right after the delete — an orphaned reply to nothing.
      this.cancelAllChats();
      await this.waitUntilStable({ timeout: 5000 });
      const index = this.messages.findIndex(
        (message) => message.id === messageId,
      );
      if (index === -1) {
        return Response.json({ error: "message not found" }, { status: 404 });
      }
      const ids = this.messages.slice(index).map((message) => message.id);
      await this.session.deleteMessages(ids);
      // Drop the stored how-the-last-turn-ended record too. It exists so a
      // reconnecting client can learn the last turn errored — but that turn
      // was just undone, and leaving it makes every future connection replay
      // a "Something went wrong" for a message that no longer exists.
      await clearChatTerminal(this.ctx.storage);
      return Response.json({ ok: true });
    }
    return super.onRequest(request);
  }
}
