import { Service, type Context } from "cordis";
import { z } from "zod";
import {
  generateKeywordDimensionsSchema,
  keywordDimensionsSchema,
  type GenerateKeywordDimensionsInput,
} from "@/types/schemas/keyword-dimensions";
import type { AiProviderScope } from "@/plugins/ai/contracts";

interface DimensionAgent {
  id: string;
  generate(
    input: GenerateKeywordDimensionsInput,
    scope: AiProviderScope,
  ): Promise<z.infer<typeof keywordDimensionsSchema>>;
}
const configSchema = z.strictObject({ keywordDimensions: z.string().min(1) });
declare module "cordis" {
  interface Context {
    aiAgents: AiAgentsService;
  }
}

/** Business contract stays independent of the chosen agent loop/runtime. */
export default class AiAgentsService extends Service {
  static Config = configSchema;
  private readonly agents = new Map<string, DimensionAgent>();
  constructor(
    ctx: Context,
    private readonly config: z.infer<typeof configSchema>,
  ) {
    super(ctx, "aiAgents");
  }
  register(agent: DimensionAgent) {
    if (this.agents.has(agent.id))
      throw new Error(`Duplicate dimension agent: ${agent.id}`);
    this.ctx.effect(() => {
      this.agents.set(agent.id, agent);
      return () => {
        this.agents.delete(agent.id);
      };
    });
  }
  private selected() {
    const agent = this.agents.get(this.config.keywordDimensions);
    if (!agent)
      throw new Error(
        `Dimension agent is not registered: ${this.config.keywordDimensions}`,
      );
    return agent;
  }
  validateRoutes() {
    this.selected();
  }
  async generateKeywordDimensions(
    input: GenerateKeywordDimensionsInput,
    scope: AiProviderScope,
  ) {
    const request = generateKeywordDimensionsSchema.parse({
      ...input,
      projectId: scope.projectId,
    });
    return keywordDimensionsSchema.parse(
      await this.selected().generate(request, scope),
    );
  }
}
