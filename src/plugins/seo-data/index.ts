import { Service, type Context } from "cordis";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  keywordMetricsInputSchema,
  keywordMetricsResultSchema,
  serpLiveInputSchema,
  serpLiveResultSchema,
  type KeywordMetric,
  type KeywordMetricsInput,
  type SerpItem,
  type SerpLiveInput,
} from "@/plugins/seo-data/schemas";

declare module "cordis" {
  interface Context {
    seoData: SeoDataService;
  }
}

interface Provider<Input, Output> {
  readonly id: string;
  /** Change when dataset, scope mapping, or normalization semantics change. */
  readonly version: string;
  query(input: Input, customer: BillingCustomerContext): Promise<Output>;
}

export type KeywordMetricsProvider = Provider<
  KeywordMetricsInput,
  KeywordMetric[]
>;
export type SerpLiveProvider = Provider<SerpLiveInput, SerpItem[]>;

const configSchema = z.strictObject({
  keywordMetrics: z.string().min(1),
  serpLive: z.string().min(1),
});

/** Selected providers own paid execution and metering. The service validates
 * the input before execution and the output before it reaches consumers. */
export default class SeoDataService extends Service {
  static Config = configSchema;

  private readonly metricsProviders = new Map<string, KeywordMetricsProvider>();
  private readonly serpProviders = new Map<string, SerpLiveProvider>();

  constructor(
    ctx: Context,
    private readonly config: z.infer<typeof configSchema>,
  ) {
    super(ctx, "seoData");
  }

  registerKeywordMetrics(provider: KeywordMetricsProvider): void {
    this.register(this.metricsProviders, provider);
  }

  registerSerpLive(provider: SerpLiveProvider): void {
    this.register(this.serpProviders, provider);
  }

  private register<P extends { id: string }>(
    providers: Map<string, P>,
    provider: P,
  ): void {
    if (providers.has(provider.id))
      throw new Error(`Duplicate SEO provider: ${provider.id}`);
    this.ctx.effect(() => {
      providers.set(provider.id, provider);
      return () => {
        providers.delete(provider.id);
      };
    });
  }

  private select<P>(providers: Map<string, P>, id: string): P {
    const provider = providers.get(id);
    if (!provider)
      throw new Error(`Configured SEO provider is not registered: ${id}`);
    return provider;
  }

  /** Called after the complete plugin tree settles, not during service init. */
  validateRoutes(): void {
    this.select(this.metricsProviders, this.config.keywordMetrics);
    this.select(this.serpProviders, this.config.serpLive);
  }

  async keywordMetrics(
    input: KeywordMetricsInput,
    customer: BillingCustomerContext,
  ): Promise<KeywordMetric[]> {
    const parsed = keywordMetricsInputSchema.parse(input);
    const provider = this.select(
      this.metricsProviders,
      this.config.keywordMetrics,
    );
    return keywordMetricsResultSchema.parse(
      await provider.query(parsed, customer),
    );
  }

  async serpLive(
    input: SerpLiveInput,
    customer: BillingCustomerContext,
  ): Promise<SerpItem[]> {
    const parsed = serpLiveInputSchema.parse(input);
    const provider = this.select(this.serpProviders, this.config.serpLive);
    return serpLiveResultSchema.parse(await provider.query(parsed, customer));
  }

  /** Identity is resolved before cache lookup and contains no credentials. */
  serpCacheIdentity(): {
    provider: string;
    version: string;
    schemaVersion: number;
  } {
    const provider = this.select(this.serpProviders, this.config.serpLive);
    return {
      provider: provider.id,
      version: provider.version,
      schemaVersion: 1,
    };
  }
}
