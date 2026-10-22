import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { googleKeywordIdeasSchema } from "@/types/schemas/google-keywords";
import { GoogleKeywordResearchService } from "@/server/features/keywords/services/GoogleKeywordResearchService";
import { GoogleAdsTargetingService } from "@/server/features/google-ads/GoogleAdsTargetingService";
import {
  googleLocationSearchInputSchema,
  googleTargetingOptionsInputSchema,
} from "@/types/schemas/google-keyword-targeting";

export const getGoogleKeywordTargetingOptions = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(googleTargetingOptionsInputSchema)
  .handler(({ data, context }) =>
    GoogleAdsTargetingService.options(data, context),
  );

export const searchGoogleKeywordLocations = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(googleLocationSearchInputSchema)
  .handler(({ data, context }) =>
    GoogleAdsTargetingService.searchLocations(data, context),
  );

export const researchGoogleKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(googleKeywordIdeasSchema)
  .handler(({ data, context }) =>
    GoogleKeywordResearchService.research(data, context),
  );
