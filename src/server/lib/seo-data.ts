// FORK: application entry points for provider-independent SEO capabilities.
import { getSeoData } from "@/plugins/server/context";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type {
  KeywordMetricsInput,
  SerpLiveInput,
} from "@/plugins/seo-data/schemas";

export async function fetchKeywordMetrics(
  input: KeywordMetricsInput,
  customer: BillingCustomerContext,
) {
  return (await getSeoData()).keywordMetrics(input, customer);
}

export async function fetchLiveSerp(
  input: SerpLiveInput,
  customer: BillingCustomerContext,
) {
  return (await getSeoData()).serpLive(input, customer);
}
