import { Service, type Context } from "cordis";
import { z } from "zod";
import { withPgClient } from "@/db";
import { AppError } from "@/server/lib/errors";
import {
  AI_PROVIDERS,
  aiProviderSchema,
  type AiProvider,
} from "@/types/schemas/ai-provider";
import {
  decisionInputSchema,
  decisionSelectionSchema,
  type DecisionInput,
  type DecisionSelection,
} from "@/types/schemas/decision";
import type {
  AiExecution,
  AiProviderDefinition,
  AiProviderScope,
} from "../contracts";
import { configuration } from "./configuration";
import { validateAnswers } from "./decisionResult";

const configSchema = z.strictObject({ textProvider: aiProviderSchema });
type Registration = {
  provider: AiProviderDefinition;
  lifetime: AbortController;
};

declare module "cordis" {
  interface Context {
    ai: AiService;
  }
}

/** Owns AI configuration, capability dispatch and per-request credential scope. */
export default class AiService extends Service {
  static Config = configSchema;
  readonly configuration = {
    getConfig: configuration.getConfig,
    saveConfig: configuration.saveConfig,
    removeConfig: configuration.removeConfig,
  };
  private readonly providers = new Map<AiProvider, Registration>();

  constructor(
    ctx: Context,
    private readonly config: z.infer<typeof configSchema>,
  ) {
    super(ctx, "ai");
  }

  register(provider: AiProviderDefinition) {
    if (this.providers.has(provider.id))
      throw new Error(`Duplicate AI provider: ${provider.id}`);
    return this.ctx.effect(() => {
      const registration = { provider, lifetime: new AbortController() };
      this.providers.set(provider.id, registration);
      return () => {
        this.providers.delete(provider.id);
        registration.lifetime.abort(new AppError("AI_PROVIDER_NOT_CONFIGURED"));
      };
    });
  }

  private select(id: AiProvider) {
    const registration = this.providers.get(id);
    if (!registration) throw new Error(`AI provider is not registered: ${id}`);
    return registration;
  }

  validateRoutes() {
    if (!this.select(this.config.textProvider).provider.languageModel)
      throw new Error("Configured AI provider does not support text models");
  }

  private async execution(
    scope: AiProviderScope,
    registration: Registration,
  ): Promise<AiExecution> {
    const signal = registration.lifetime.signal;
    signal.throwIfAborted();
    const connection = await withPgClient(() =>
      configuration.resolve(scope, registration.provider.id),
    );
    signal.throwIfAborted();
    return {
      connection,
      signal,
      beforeRequest: async () => {
        signal.throwIfAborted();
        await withPgClient(() =>
          configuration.recordUse(
            scope,
            registration.provider.id,
            connection.revision,
          ),
        );
        signal.throwIfAborted();
      },
    };
  }

  async languageModel(
    scope: AiProviderScope,
    modelId: string,
    provider = this.config.textProvider,
  ) {
    const selected = this.select(provider);
    if (!selected.provider.languageModel)
      throw new Error("Configured AI provider does not support text models");
    return selected.provider.languageModel(
      await this.execution(scope, selected),
      modelId,
    );
  }

  async decide(
    input: DecisionInput,
    scope: AiProviderScope,
    selection: DecisionSelection = {},
  ) {
    const request = decisionInputSchema.parse(input);
    const { provider, model } = decisionSelectionSchema.parse(selection);
    const selected = this.select(provider);
    if (!selected.provider.decide)
      throw new Error("Configured AI provider does not support decisions");
    const execution = await this.execution(scope, selected);
    const requestedModel = model ?? AI_PROVIDERS[provider].decisionModel;
    const result = await selected.provider.decide(
      request,
      execution,
      requestedModel,
    );
    validateAnswers(request, result);
    return {
      ...result,
      provider,
      requestedModel,
      configRevision: execution.connection.revision,
    };
  }

  listModels(provider: AiProvider) {
    const selected = this.select(provider);
    if (!selected.provider.listModels)
      throw new AppError("AI_MODEL_CATALOG_UNAVAILABLE");
    return selected.provider.listModels(selected.lifetime.signal);
  }
}
