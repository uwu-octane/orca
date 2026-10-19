import type { Context } from "cordis";
import {
  createMeteredDataforseoClient,
  loadDataforseoSections,
  type DataforseoSections,
} from "@/plugins/dataforseo/client";
import { fetchKeywordMetricsForList } from "@/server/lib/dataforseo/keyword-metrics";
import type { fetchSerpLocationsForCountry } from "@/server/lib/dataforseo/serp-locations";

export const name = "dataforseo";
export const inject = ["seoData"];

/** Vendor-specific compatibility API. SDK-derived protocols remain here;
 * portable keyword metrics and live SERPs are declared by seoData. */
export interface DataforseoProvider {
  createClient: typeof createMeteredDataforseoClient;
  collectLocalTask: DataforseoSections["fetchLocalSerpTaskResult"];
  collectAiTrackingTask: DataforseoSections["fetchAiTrackingTaskResult"];
  collectRankTask: DataforseoSections["fetchRankCheckTaskResult"];
  collectBusinessTask: DataforseoSections["fetchBusinessDataTaskResult"];
  businessCategories: DataforseoSections["fetchBusinessListingsCategories"];
  serpLocations: typeof fetchSerpLocationsForCountry;
}

declare module "cordis" {
  interface Context {
    dataforseo: DataforseoProvider;
  }
}

/** Registration performs no credential reads, SDK imports, or network calls. */
export function apply(ctx: Context): void {
  const provider: DataforseoProvider = {
    createClient: createMeteredDataforseoClient,
    collectLocalTask: async (input) =>
      (await loadDataforseoSections()).fetchLocalSerpTaskResult(input),
    collectAiTrackingTask: async (input) =>
      (await loadDataforseoSections()).fetchAiTrackingTaskResult(input),
    collectRankTask: async (input) =>
      (await loadDataforseoSections()).fetchRankCheckTaskResult(input),
    collectBusinessTask: async (input) =>
      (await loadDataforseoSections()).fetchBusinessDataTaskResult(input),
    businessCategories: async () =>
      (await loadDataforseoSections()).fetchBusinessListingsCategories(),
    serpLocations: async (countryCode) =>
      (
        await import("@/server/lib/dataforseo/serp-locations")
      ).fetchSerpLocationsForCountry(countryCode),
  };
  ctx.provide("dataforseo", provider);
  ctx.seoData.registerKeywordMetrics({
    id: "dataforseo",
    version: "2",
    query: (input, customer) =>
      fetchKeywordMetricsForList(provider.createClient(customer), input),
  });
  ctx.seoData.registerSerpLive({
    id: "dataforseo",
    version: "2",
    query: (input, customer) =>
      provider.createClient(customer).serp.live(input),
  });
}
