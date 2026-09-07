import { afterEach, describe, expect, it, vi } from "vitest";
import { Context } from "cordis";
import SeoDataService from "@/plugins/seo-data";
import type { KeywordMetric } from "@/plugins/seo-data/schemas";
import { bootPlugins } from "@/plugins/shared/plugin";

const customer = {
  organizationId: "org_1",
  userId: "user_1",
  userEmail: "u@example.com",
};
const request = {
  keywords: ["seo"],
  locationCode: 2840,
  languageCode: "en",
  creditFeature: "keyword_research" as const,
};
const row: KeywordMetric = {
  keyword: "seo",
  searchVolume: 0,
  cpc: null,
  competition: null,
  competitionLevel: null,
  keywordDifficulty: null,
  intent: null,
  monthlySearches: [],
};
const roots: Context[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((ctx) => ctx.fiber.dispose()));
});

async function setup() {
  const ctx = new Context();
  roots.push(ctx);
  const metrics = vi.fn(async () => [row]);
  const serp = vi.fn(async () => [
    { type: "organic", rank_group: 1, rank_absolute: 3 },
  ]);
  await bootPlugins(
    ctx,
    [
      { id: "consumer", name: "provider" },
      {
        id: "seo",
        name: "seo-data",
        config: { keywordMetrics: "metrics-only", serpLive: "serp-only" },
      },
    ],
    {
      "seo-data": async () => ({ default: SeoDataService }),
      provider: async () => ({
        inject: ["seoData"],
        apply(pluginContext: Context) {
          pluginContext.seoData.registerKeywordMetrics({
            id: "metrics-only",
            version: "1",
            query: metrics,
          });
          pluginContext.seoData.registerSerpLive({
            id: "serp-only",
            version: "2",
            query: serp,
          });
        },
      }),
    },
  );
  return { ctx, metrics, serp, service: ctx.seoData };
}

describe("SEO capability providers", () => {
  it("selects separate providers per capability and passes each call's billing identity", async () => {
    const { service, metrics, serp } = await setup();
    service.validateRoutes();
    expect(await service.keywordMetrics(request, customer)).toEqual([row]);
    const otherCustomer = { ...customer, organizationId: "org_2" };
    await service.keywordMetrics(request, otherCustomer);
    expect(metrics.mock.calls).toEqual([
      [request, customer],
      [request, otherCustomer],
    ]);
    expect(serp).not.toHaveBeenCalled();
    expect(
      await service.serpLive(
        { keyword: "seo", locationCode: 2840, languageCode: "en" },
        customer,
      ),
    ).toEqual([{ type: "organic", rank_group: 1, rank_absolute: 3 }]);
    expect(service.serpCacheIdentity()).toEqual({
      provider: "serp-only",
      version: "2",
      schemaVersion: 1,
    });
  });

  it("rejects invalid inputs before invoking a paid provider", async () => {
    const { service, metrics } = await setup();
    await expect(
      service.keywordMetrics({ ...request, locationCode: -1 }, customer),
    ).rejects.toThrow();
    expect(metrics).not.toHaveBeenCalled();
  });

  it("rejects invalid output without inventing missing metric values", async () => {
    const { service, metrics } = await setup();
    metrics.mockResolvedValue([{ ...row, competition: 50 }]);
    await expect(service.keywordMetrics(request, customer)).rejects.toThrow();
    expect(metrics).toHaveBeenCalledOnce();
  });

  it("does not select another registered provider after a selected provider fails", async () => {
    const { service, metrics } = await setup();
    const other = vi.fn(async () => [row]);
    service.registerKeywordMetrics({ id: "other", version: "1", query: other });
    const failure = new Error("selected provider failed");
    metrics.mockRejectedValue(failure);
    await expect(service.keywordMetrics(request, customer)).rejects.toBe(
      failure,
    );
    expect(other).not.toHaveBeenCalled();
  });

  it("removes registrations when the contributing plugin is unloaded", async () => {
    const { ctx, service } = await setup();
    await ctx.loader.remove("consumer");
    expect(() => service.validateRoutes()).toThrow(/metrics-only/);
    await expect(service.keywordMetrics(request, customer)).rejects.toThrow(
      /not registered/,
    );
  });

  it("rejects duplicate provider IDs", async () => {
    const { service, metrics } = await setup();
    expect(() =>
      service.registerKeywordMetrics({
        id: "metrics-only",
        version: "2",
        query: metrics,
      }),
    ).toThrow(/Duplicate SEO provider/);
  });

  it("requires the configured ID even when a different provider is available", async () => {
    const ctx = new Context();
    roots.push(ctx);
    await ctx.plugin(SeoDataService, {
      keywordMetrics: "missing",
      serpLive: "missing",
    });
    ctx.seoData.registerKeywordMetrics({
      id: "other",
      version: "1",
      query: async () => [row],
    });
    expect(() => ctx.seoData.validateRoutes()).toThrow(/missing/);
  });
});
