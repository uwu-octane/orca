import type { ZodRawShape } from "zod";
import { Service, type Context } from "cordis";
import { wrapLanguageModel, type ToolSet } from "ai";
import type { AiProviderScope } from "@/plugins/ai/contracts";
import type {
  SamToolContext,
  SamToolFactory,
  SamMcpToolDefinition,
} from "../contracts";
import { createSessions } from "./sessions";

declare module "cordis" {
  interface Context {
    sam: SamService;
  }
}

/** Complete SAM domain; request identities belong to calls and DO instances. */
export default class SamService extends Service {
  static inject = ["ai"];
  private readonly lifetime = new AbortController();
  readonly sessions = createSessions(this.lifetime.signal);
  private readonly tools = new Map<
    string,
    { factory: SamToolFactory; lifetime: AbortController }
  >();

  constructor(ctx: Context) {
    super(ctx, "sam");
    ctx.effect(
      () => () => this.lifetime.abort(new Error("SAM plugin is not active")),
    );
  }

  async setup(scope: AiProviderScope) {
    this.lifetime.signal.throwIfAborted();
    const config = await this.ctx.ai.configuration.getConfig(
      scope,
      "vercel_gateway",
    );
    const enabled = config?.hasApiKey === true;
    return {
      enabled,
      errorMessage: enabled ? null : "AI_PROVIDER_NOT_CONFIGURED",
    };
  }

  async languageModel(scope: AiProviderScope, modelId: string) {
    const signal = this.lifetime.signal;
    signal.throwIfAborted();
    const model = await this.ctx.ai.languageModel(scope, modelId);
    signal.throwIfAborted();
    return wrapLanguageModel({
      model,
      middleware: {
        specificationVersion: "v3",
        transformParams: async ({ params }) => {
          signal.throwIfAborted();
          return {
            ...params,
            abortSignal: params.abortSignal
              ? AbortSignal.any([signal, params.abortSignal])
              : signal,
          };
        },
      },
    });
  }

  registerMcpTool<Shape extends ZodRawShape>(
    definition: SamMcpToolDefinition<Shape>,
  ) {
    return this.registerTool(
      definition.name,
      async ({ auth, project, turnId }) => {
        const { adaptMcpTool } = await import("./samChatTools");
        return adaptMcpTool(definition, { auth, turnId }, project.id);
      },
    );
  }

  registerTool(name: string, factory: SamToolFactory) {
    this.lifetime.signal.throwIfAborted();
    if (this.tools.has(name)) throw new Error(`Duplicate SAM tool: ${name}`);
    return this.ctx.effect(() => {
      const registration = { factory, lifetime: new AbortController() };
      this.tools.set(name, registration);
      return () => {
        this.tools.delete(name);
        registration.lifetime.abort(
          new Error(`SAM tool is not registered: ${name}`),
        );
      };
    });
  }

  async buildTools(context: SamToolContext): Promise<ToolSet> {
    const signal = this.lifetime.signal;
    signal.throwIfAborted();
    const { buildSamMcpTools } = await import("./samChatTools");
    const tools = buildSamMcpTools(
      context.auth,
      context.project,
      context.turnId,
    );
    const lifetimes = new Map<string, AbortSignal>();
    for (const [name, registration] of this.tools) {
      if (Object.hasOwn(tools, name))
        throw new Error(`Duplicate SAM tool: ${name}`);
      tools[name] = await registration.factory(context);
      lifetimes.set(name, registration.lifetime.signal);
    }
    signal.throwIfAborted();
    for (const [name, definition] of Object.entries(tools)) {
      const execute = definition.execute;
      if (!execute) continue;
      const contribution = lifetimes.get(name);
      tools[name] = {
        ...definition,
        execute: (args, options) => {
          const abortSignal = AbortSignal.any([
            signal,
            ...(contribution ? [contribution] : []),
            ...(options.abortSignal ? [options.abortSignal] : []),
          ]);
          abortSignal.throwIfAborted();
          const result: unknown = execute(args, { ...options, abortSignal });
          return result;
        },
      };
    }
    return tools;
  }
}
