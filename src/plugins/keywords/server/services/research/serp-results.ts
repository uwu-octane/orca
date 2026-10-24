import type { Context } from "cordis";
import { waitUntil } from "cloudflare:workers";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import { toolErrorMessage } from "@/server/mcp/tool-error-message";
import { serpItemSchema, type SerpResultsInput } from "../../../serp-contracts";
import { assertLocalResearchLocation } from "./local-volume";

const SERP_RESULTS_CACHE_TTL_SECONDS = 12 * 60 * 60;

/** Mixed SERP rows preserve per-query errors, ranks, device and cache semantics. */
export async function getSerpResults(
  services: Pick<Context, "seoData" | "dataforseo">,
  args: SerpResultsInput,
  billing: BillingCustomerContext,
) {
  const { depth } = args;
  const results = await Promise.all(
    args.queries.map(async (q) => {
      try {
        const market = {
          locationCode: q.locationCode,
          languageCode: q.languageCode,
        };
        if (q.locationName) {
          await assertLocalResearchLocation(
            services.dataforseo,
            market.locationCode,
            q.locationName,
          );
        }
        const cacheKey = await buildCacheKey("mcp:serp-results", {
          organizationId: billing.organizationId,
          projectId: args.projectId,
          keyword: q.keyword,
          ...market,
          locationName: q.locationName,
          depth,
          // Omitted for desktop, explicit or default, so desktop keys match
          // rows cached before the device option existed.
          device: q.device === "mobile" ? "mobile" : undefined,
        });
        const cached = z
          .array(serpItemSchema)
          .safeParse(await getCached(cacheKey));
        if (cached.success) {
          return {
            keyword: q.keyword,
            ok: true as const,
            items: cached.data,
          };
        }

        const items = await services.seoData.serpLive(
          {
            keyword: q.keyword,
            ...market,
            locationName: q.locationName,
            depth,
            device: q.device,
          },
          billing,
        );
        // Trim noise — return only essentials per item.
        const trimmed = items.slice(0, depth).map((item) => ({
          type: item.type,
          rank: item.rank_absolute ?? item.rank_group ?? null,
          organicRank:
            item.type === "organic" ? (item.rank_group ?? null) : null,
          title: item.title ?? null,
          url: item.url ?? null,
          domain: item.domain ?? null,
          description: item.description ?? null,
        }));
        // DataForSEO reports "no results" transiently; don't pin that for
        // the whole window. waitUntil, not void: workerd cancels
        // unregistered pending I/O once the response is sent.
        if (trimmed.length > 0) {
          waitUntil(
            setCached(cacheKey, trimmed, SERP_RESULTS_CACHE_TTL_SECONDS).catch(
              (error) => {
                console.error("mcp.serp-results.cache-write failed:", error);
              },
            ),
          );
        }
        return { keyword: q.keyword, ok: true as const, items: trimmed };
      } catch (error) {
        return {
          keyword: q.keyword,
          ok: false as const,
          error: toolErrorMessage(error),
        };
      }
    }),
  );

  return results;
}
