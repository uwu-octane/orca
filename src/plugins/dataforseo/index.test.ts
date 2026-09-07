import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Context } from "cordis";
import { z } from "zod";
import { getAppContext } from "@/plugins/server/context";
import {
  createDataforseoClient,
  fetchRankCheckTaskResult,
  fetchBusinessListingsCategories,
} from "@/server/lib/dataforseo";
import { fetchKeywordMetrics } from "@/server/lib/seo-data";
import { parseTaskItems } from "@/server/lib/dataforseo/envelope";

const state = vi.hoisted(() => ({
  loads: 0,
  gate: vi.fn(async () => ({ monthlyRemaining: 1000 })),
  track: vi.fn(),
  live: vi.fn(),
  overview: vi.fn(),
  collect: vi.fn(async () => ({ status: "pending" })),
  categories: vi.fn(async () => [{ category_id: 1 }]),
}));

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => true,
}));
vi.mock("@/server/billing/subscription", () => ({
  getOrCreateOrganizationCustomer: async (customer: {
    organizationId: string;
  }) => ({ id: customer.organizationId }),
  assertUsageCreditsAvailable: state.gate,
  trackUsageCreditSpend: state.track,
}));
vi.mock("@/server/lib/dataforseo/sections", () => {
  state.loads++;
  return {
    fetchLiveSerp: state.live,
    fetchKeywordOverview: state.overview,
    fetchRankCheckTaskResult: state.collect,
    fetchBusinessListingsCategories: state.categories,
  };
});

const customer = {
  organizationId: "org_1",
  userId: "user_1",
  userEmail: "u@example.com",
};
const input = { keyword: "seo", locationCode: 2840, languageCode: "en" };
const billing = {
  path: ["v3", "serp", "google", "organic", "live"],
  costUsd: 0.03,
};
let context: Context;
beforeAll(async () => {
  context = await getAppContext();
});
afterAll(async () => {
  await context.fiber.dispose();
});

describe("installed DataForSEO plugin", () => {
  it("boots the real manifest without loading sections, then meters paid calls and leaves collection free", async () => {
    expect(state.loads).toBe(0);
    expect(state.gate).not.toHaveBeenCalled();
    const client = createDataforseoClient(customer);
    expect(state.loads).toBe(0);

    state.live.mockResolvedValue({
      data: [{ type: "organic", rank_group: 1, rank_absolute: 2 }],
      billing,
    });
    expect(await client.serp.live(input)).toEqual([
      { type: "organic", rank_group: 1, rank_absolute: 2 },
    ]);
    expect(state.loads).toBe(1);
    expect(state.gate).toHaveBeenCalledWith("org_1");
    expect(state.track).toHaveBeenCalledOnce();
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({
        customer,
        costUsd: 0.03,
        creditFeature: "keyword_research",
      }),
    );

    await fetchRankCheckTaskResult({
      taskId: "task_1",
      keywordId: "kw_1",
      keyword: "seo",
      targetDomain: "example.com",
    });
    await fetchBusinessListingsCategories();
    expect(state.collect).toHaveBeenCalledOnce();
    expect(state.categories).toHaveBeenCalledOnce();
    expect(state.gate).toHaveBeenCalledOnce();
    expect(state.track).toHaveBeenCalledOnce();

    state.overview.mockResolvedValue({
      data: [{ keyword: "seo", keyword_info: { search_volume: 42 } }],
      billing,
    });
    const otherCustomer = { ...customer, organizationId: "org_2" };
    const metrics = await fetchKeywordMetrics(
      {
        keywords: ["seo"],
        locationCode: 2840,
        languageCode: "en",
        creditFeature: "rank_tracking",
      },
      otherCustomer,
    );
    expect(metrics[0]).toMatchObject({
      keyword: "seo",
      searchVolume: 42,
      keywordDifficulty: null,
    });
    expect(state.gate).toHaveBeenLastCalledWith("org_2");
    expect(state.track).toHaveBeenCalledTimes(2);
    expect(state.track).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customer: otherCustomer,
        creditFeature: "rank_tracking",
      }),
    );
  });

  it("meters a billed payload validation failure once through the public facade", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.live.mockImplementation(async () => ({
      data: parseTaskItems(
        "live",
        {
          path: billing.path,
          cost: billing.costUsd,
          result: [{ items: [{ type: 1 }] }],
        },
        z.object({ type: z.string() }),
      ),
      billing,
    }));
    await expect(
      createDataforseoClient(customer).serp.live(input),
    ).rejects.toMatchObject({ billing });
    expect(state.track).toHaveBeenCalledOnce();
  });

  it("retains the charge when the capability rejects normalized output", async () => {
    state.overview.mockResolvedValue({
      data: [{ keyword: "seo", keyword_info: { competition: 50 } }],
      billing,
    });
    await expect(
      fetchKeywordMetrics(
        {
          keywords: [input.keyword],
          locationCode: input.locationCode,
          languageCode: input.languageCode,
          creditFeature: "keyword_research",
        },
        customer,
      ),
    ).rejects.toThrow();
    expect(state.gate).toHaveBeenCalledOnce();
    expect(state.track).toHaveBeenCalledOnce();
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({ customer, costUsd: billing.costUsd }),
    );
  });
});
