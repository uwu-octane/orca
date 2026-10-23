import { Service, type Context } from "cordis";
import type { LanguageModel } from "ai";
import { z } from "zod";
import type { AiProviderScope } from "@/server/features/ai/AiProviderConfigRepository";
import type { executeSystemOneDecision } from "@/server/features/decision/systemOneRequest";
import { aiProviderSchema, type AiProvider } from "@/types/schemas/ai-provider";
import {
  type DecisionInput,
  type DecisionSelection,
} from "@/types/schemas/decision";

export type TextModel = Extract<LanguageModel, { specificationVersion: "v3" }>;
export interface AiModelProvider {
  id: AiProvider;
  languageModel?: (
    scope: AiProviderScope,
    modelId: string,
  ) => Promise<TextModel>;
  decide: typeof executeSystemOneDecision;
}
const configSchema = z.strictObject({ textProvider: aiProviderSchema });

declare module "cordis" {
  interface Context {
    aiModels: AiModelsService;
  }
}

/** Stateless registry. Project identities and credentials never live on it. */
export default class AiModelsService extends Service {
  static Config = configSchema;
  private readonly providers = new Map<AiProvider, AiModelProvider>();

  constructor(
    ctx: Context,
    private readonly config: z.infer<typeof configSchema>,
  ) {
    super(ctx, "aiModels");
  }

  register(provider: AiModelProvider) {
    if (this.providers.has(provider.id))
      throw new Error(`Duplicate AI provider: ${provider.id}`);
    this.ctx.effect(() => {
      this.providers.set(provider.id, provider);
      return () => {
        this.providers.delete(provider.id);
      };
    });
  }

  private select(id: AiProvider) {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`AI provider is not registered: ${id}`);
    return provider;
  }

  validateRoutes() {
    if (!this.select(this.config.textProvider).languageModel)
      throw new Error("Configured AI provider does not support text models");
  }

  languageModel(scope: AiProviderScope, modelId: string) {
    const create = this.select(this.config.textProvider).languageModel;
    if (!create)
      throw new Error("Configured AI provider does not support text models");
    return create(scope, modelId);
  }

  decide(
    input: DecisionInput,
    scope: AiProviderScope,
    selection: DecisionSelection,
  ) {
    return this.select(selection.provider ?? "vercel_gateway").decide(
      input,
      scope,
      selection,
    );
  }
}
