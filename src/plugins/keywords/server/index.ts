import { Service, type Context } from "cordis";
import { AppError } from "@/server/lib/errors";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { DEFAULT_LLM_MODEL } from "@/types/schemas/ai-provider";
import {
  generateKeywordDimensionsSchema,
  type GenerateKeywordDimensionsInput,
} from "@/types/schemas/keyword-dimensions";
import type { GoogleKeywordIdeasInput } from "@/types/schemas/google-keywords";
import type { KeywordScope } from "../contracts";
import * as research from "./services/research";
import { researchGoogle } from "./services/GoogleKeywordResearchService";
import { generateDimensions } from "./dimensions/agent";
import { keywordDimensionTool } from "./dimensions/sam-tool";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { CreditFeature } from "@/shared/billing-credit-features";
import type {
  ResolvedResearchKeywordsInput,
  RefreshSavedKeywordMetricsInput,
} from "@/types/schemas/keywords";
import type { SerpResultsInput } from "../serp-contracts";
import { getSerpResults } from "./services/research/serp-results";
import { buildResearchKeywordsTool } from "../tools/research-keywords";
import { buildSaveKeywordsTool } from "../tools/save-keywords";
import { buildListSavedKeywordsTool } from "../tools/list-saved-keywords";
import { buildRemoveSavedKeywordsTool } from "../tools/remove-saved-keywords";
import { buildGetSerpResultsTool } from "../tools/get-serp-results";

declare module "cordis" {
  interface Context {
    keywords: KeywordsService;
  }
}

/** Owns research, persistence and dimension generation; providers carry no tenant state. */
export default class KeywordsService extends Service {
  private data?: Pick<Context, "dataforseo" | "seoData">;
  private google?: Pick<Context, "googleOAuth" | "googleAds">;
  private generation?: { ai: Context["ai"]; signal: AbortSignal };
  private readonly lifetime = new AbortController();

  constructor(ctx: Context) {
    super(ctx, "keywords");
    ctx.effect(
      () => () =>
        this.lifetime.abort(new Error("Keywords plugin is not active")),
    );
    // Dependencies activate only their capability. Saved data remains accessible
    // without a supplier or model, and neither research provider substitutes for another.
    ctx.inject(["dataforseo", "seoData"], (scope) => {
      scope.effect(() => {
        this.data = { dataforseo: scope.dataforseo, seoData: scope.seoData };
        return () => {
          this.data = undefined;
        };
      });
    });
    ctx.inject(["googleOAuth", "googleAds"], (scope) => {
      scope.effect(() => {
        this.google = {
          googleOAuth: scope.googleOAuth,
          googleAds: scope.googleAds,
        };
        return () => {
          this.google = undefined;
        };
      });
    });
    ctx.inject(["ai"], (scope) => {
      scope.effect(() => {
        const lifetime = new AbortController();
        this.generation = { ai: scope.ai, signal: lifetime.signal };
        return () => {
          this.generation = undefined;
          lifetime.abort(new AppError("AI_PROVIDER_NOT_CONFIGURED"));
        };
      });
    });
    ctx.inject(["sam"], (scope) => {
      scope.sam.registerMcpTool(buildResearchKeywordsTool(() => this));
      scope.sam.registerMcpTool(buildSaveKeywordsTool(() => this));
      scope.sam.registerMcpTool(buildListSavedKeywordsTool(() => this));
      scope.sam.registerMcpTool(buildRemoveSavedKeywordsTool(() => this));
      scope.sam.registerMcpTool(buildGetSerpResultsTool(() => this));
      scope.sam.registerTool(
        "generate_keyword_dimensions",
        ({ auth, project }) =>
          keywordDimensionTool(
            { projectId: project.id, organizationId: auth.organizationId },
            (input, identity, signal) =>
              this.generateDimensions(input, identity, signal),
          ),
      );
    });
  }

  private dataServices() {
    this.lifetime.signal.throwIfAborted();
    if (!this.data)
      throw new Error("Keyword research provider is not configured");
    return this.data;
  }

  research(
    input: ResolvedResearchKeywordsInput,
    billing: BillingCustomerContext,
    creditFeature?: CreditFeature,
  ) {
    return research.research(
      this.dataServices().dataforseo,
      input,
      billing,
      creditFeature,
    );
  }
  getSerpAnalysis(
    input: Parameters<typeof research.getSerpAnalysis>[1],
    billing: BillingCustomerContext,
  ) {
    return research.getSerpAnalysis(this.dataServices(), input, billing);
  }
  getSerpResults(input: SerpResultsInput, billing: BillingCustomerContext) {
    return getSerpResults(this.dataServices(), input, billing);
  }
  refreshSavedKeywordMetrics(
    input: RefreshSavedKeywordMetricsInput,
    billing: BillingCustomerContext,
  ) {
    return research.refreshSavedKeywordMetrics(
      this.dataServices().seoData,
      input,
      billing,
    );
  }
  researchGoogle(input: GoogleKeywordIdeasInput, scope: KeywordScope) {
    this.lifetime.signal.throwIfAborted();
    if (!this.google) throw new AppError("GOOGLE_ADS_NOT_CONFIGURED");
    return researchGoogle(this.google, input, scope);
  }
  async generateDimensions(
    input: GenerateKeywordDimensionsInput,
    scope: KeywordScope,
    signal?: AbortSignal,
  ) {
    this.lifetime.signal.throwIfAborted();
    const request = generateKeywordDimensionsSchema.parse({
      ...input,
      projectId: scope.projectId,
    });
    const project = await ProjectRepository.getProjectForOrganization(
      scope.projectId,
      scope.organizationId,
    );
    if (!project) throw new AppError("NOT_FOUND");
    const generation = this.generation;
    if (!generation) throw new AppError("AI_PROVIDER_NOT_CONFIGURED");
    const abortSignal = AbortSignal.any([
      this.lifetime.signal,
      generation.signal,
      ...(signal ? [signal] : []),
    ]);
    abortSignal.throwIfAborted();
    const model = await generation.ai.languageModel(
      scope,
      request.model ?? DEFAULT_LLM_MODEL,
    );
    abortSignal.throwIfAborted();
    return generateDimensions(model, request, abortSignal);
  }

  saveKeywords(...args: Parameters<typeof research.saveKeywords>) {
    this.lifetime.signal.throwIfAborted();
    return research.saveKeywords(...args);
  }
  getSavedKeywords(...args: Parameters<typeof research.getSavedKeywords>) {
    this.lifetime.signal.throwIfAborted();
    return research.getSavedKeywords(...args);
  }
  exportSavedKeywords(
    ...args: Parameters<typeof research.exportSavedKeywords>
  ) {
    this.lifetime.signal.throwIfAborted();
    return research.exportSavedKeywords(...args);
  }
  updateSavedKeywordTags(
    ...args: Parameters<typeof research.updateSavedKeywordTags>
  ) {
    this.lifetime.signal.throwIfAborted();
    return research.updateSavedKeywordTags(...args);
  }
  updateSavedKeywordTag(
    ...args: Parameters<typeof research.updateSavedKeywordTag>
  ) {
    this.lifetime.signal.throwIfAborted();
    return research.updateSavedKeywordTag(...args);
  }
  deleteSavedKeywordTag(
    ...args: Parameters<typeof research.deleteSavedKeywordTag>
  ) {
    this.lifetime.signal.throwIfAborted();
    return research.deleteSavedKeywordTag(...args);
  }
  removeSavedKeywords(
    ...args: Parameters<typeof research.removeSavedKeywords>
  ) {
    this.lifetime.signal.throwIfAborted();
    return research.removeSavedKeywords(...args);
  }
}
