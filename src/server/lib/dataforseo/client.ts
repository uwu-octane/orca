// FORK: compatibility facade; implementation and metering belong to the
// DataForSEO Cordis plugin. No provider or SDK loads until a method is called.
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { createMeteredDataforseoClient } from "@/plugins/dataforseo/client";
import { getDataforseoProvider } from "@/plugins/server/context";
import { fetchLiveSerp } from "@/server/lib/seo-data";

export { mapDataforseoPathToCreditFeature } from "@/shared/billing-credit-features";

type DataforseoClient = ReturnType<typeof createMeteredDataforseoClient>;

export function createDataforseoClient(
  customer: BillingCustomerContext,
): DataforseoClient {
  function defer<I, T>(
    select: (client: DataforseoClient) => (input: I) => Promise<T>,
  ) {
    return async (input: I): Promise<T> => {
      const provider = await getDataforseoProvider();
      return select(provider.createClient(customer))(input);
    };
  }
  return {
    business: {
      businessListings: defer((client) => client.business.businessListings),
      questionsAnswers: defer((client) => client.business.questionsAnswers),
      myBusinessInfo: defer((client) => client.business.myBusinessInfo),
      reviewsTaskPost: defer((client) => client.business.reviewsTaskPost),
      updatesTaskPost: defer((client) => client.business.updatesTaskPost),
    },
    backlinks: {
      summary: defer((client) => client.backlinks.summary),
      rows: defer((client) => client.backlinks.rows),
      referringDomains: defer((client) => client.backlinks.referringDomains),
      domainPages: defer((client) => client.backlinks.domainPages),
      history: defer((client) => client.backlinks.history),
    },
    keywords: {
      related: defer((client) => client.keywords.related),
      suggestions: defer((client) => client.keywords.suggestions),
      ideas: defer((client) => client.keywords.ideas),
      adsIdeas: defer((client) => client.keywords.adsIdeas),
      adsSearchVolume: defer((client) => client.keywords.adsSearchVolume),
    },
    domain: {
      rankOverview: defer((client) => client.domain.rankOverview),
      rankedKeywords: defer((client) => client.domain.rankedKeywords),
      relevantPages: defer((client) => client.domain.relevantPages),
    },
    serp: {
      live: (input) => fetchLiveSerp(input, customer),
      rankCheckBatch: defer((client) => client.serp.rankCheckBatch),
      rankCheckTaskPost: defer((client) => client.serp.rankCheckTaskPost),
      localTaskPost: defer((client) => client.serp.localTaskPost),
      local: defer((client) => client.serp.local),
    },
    labs: {
      keywordOverview: defer((client) => client.labs.keywordOverview),
      serpCompetitors: defer((client) => client.labs.serpCompetitors),
    },
    lighthouse: {
      live: defer((client) => client.lighthouse.live),
    },
    aiSearch: {
      trackingTaskPost: defer((client) => client.aiSearch.trackingTaskPost),
      trackingLiveBatch: defer((client) => client.aiSearch.trackingLiveBatch),
      mentionsSearch: defer((client) => client.aiSearch.mentionsSearch),
      aggregatedMetrics: defer((client) => client.aiSearch.aggregatedMetrics),
      topPages: defer((client) => client.aiSearch.topPages),
      crossAggregatedMetrics: defer(
        (client) => client.aiSearch.crossAggregatedMetrics,
      ),
      llmResponse: defer((client) => client.aiSearch.llmResponse),
    },
  };
}
