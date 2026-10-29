// FORK: compatibility surface of the DataForSEO Cordis plugin. Section files
// and the SDK load lazily through src/plugins/dataforseo/client.ts, which
// owns metering. Portable capabilities live in server/lib/seo-data.ts.
// Runtime values re-exported here must be SDK-free
// (shared.ts) or lazy — a static value re-export from a section file would
// drag the SDK back into the eager isolate startup graph.

// FORK: all application I/O is resolved through the Cordis provider.
import { getDataforseoProvider } from "@/plugins/server/context";
import type { DataforseoProvider } from "@/plugins/dataforseo";

export { createDataforseoClient } from "@/server/lib/dataforseo/client";
export {
  AI_TRACKING_HOLD_TTL_MS,
  type AiTrackingHold,
} from "@/server/lib/dataforseo/ai-tracking-billing";

export {
  buildLlmTarget,
  CHATGPT_LANGUAGE_CODE,
  CHATGPT_LOCATION_CODE,
  MAX_TASKS_PER_POST,
  type LlmPlatform,
} from "@/server/lib/dataforseo/shared";

export { SERP_ANALYSIS_DEPTH } from "@/server/lib/dataforseo/serp";

export { normalizeBacklinksTarget } from "@/server/lib/dataforseoBacklinksTarget";

/** Lazy wrappers for the section fetchers called outside the metered client.
 * Task collection is free at DataForSEO (the task was charged at task_post), so
 * routing these through the metering seam would charge the customer twice. */
export const fetchRankCheckTaskResult: DataforseoProvider["collectRankTask"] =
  async (input) => (await getDataforseoProvider()).collectRankTask(input);

export const fetchBusinessDataTaskResult: DataforseoProvider["collectBusinessTask"] =
  async (input) => (await getDataforseoProvider()).collectBusinessTask(input);

/** Free ($0) at DataForSEO, so it skips the metered client entirely — a
 *  zero-credit org can still list categories. */
export const fetchBusinessListingsCategories: DataforseoProvider["businessCategories"] =
  async () => (await getDataforseoProvider()).businessCategories();

export type {
  BusinessTaskEndpoint,
  BusinessTaskOutcome,
} from "@/server/lib/dataforseo/business";

export type {
  LabsKeywordDataItem,
  DomainRankedKeywordItem,
  RelevantPagesItem,
} from "@/server/lib/dataforseo/labs";

export type { AdsKeywordIdeaItem } from "@/server/lib/dataforseo/google-ads";

export type {
  LocalSerpTaskOutcome,
  SerpLiveItem,
  RankCheckResult,
  RankCheckTaskInput,
  PostedRankCheckTask,
} from "@/server/lib/dataforseo/serp";

export type {
  BacklinksSummaryItem,
  BacklinksItem,
  ReferringDomainItem,
  DomainPageSummaryItem,
  BacklinksHistoryItem,
} from "@/server/lib/dataforseo/backlinks";

/** Free geographic catalog, loaded by the installed provider on demand. */
export const fetchSerpLocationsForCountry: DataforseoProvider["serpLocations"] =
  async (countryCode) =>
    (await getDataforseoProvider()).serpLocations(countryCode);

export const fetchLocalSerpTaskResult: DataforseoProvider["collectLocalTask"] =
  async (input) => (await getDataforseoProvider()).collectLocalTask(input);
export const fetchAiTrackingTaskResult: DataforseoProvider["collectAiTrackingTask"] =
  async (input) => (await getDataforseoProvider()).collectAiTrackingTask(input);
export type {
  AiTrackingAnswer,
  PostedAiTrackingTask,
} from "@/server/lib/dataforseo/ai-tracking";
