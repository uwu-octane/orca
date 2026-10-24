import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { googleKeywordIdeasSchema } from "@/types/schemas/google-keywords";
// FORK: business operations resolve the installed Keywords domain.
import { getKeywords } from "@/plugins/server/context";
// FORK: targeting resolves the installed Ads provider.
import { getGoogleAds } from "@/plugins/server/context";
import {
  googleLocationSearchInputSchema,
  googleTargetingOptionsInputSchema,
} from "@/types/schemas/google-keyword-targeting";

export const getGoogleKeywordTargetingOptions = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(googleTargetingOptionsInputSchema)
  .handler(async ({ data, context }) =>
    (await getGoogleAds()).options(data, context),
  );

export const searchGoogleKeywordLocations = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(googleLocationSearchInputSchema)
  .handler(async ({ data, context }) =>
    (await getGoogleAds()).searchLocations(data, context),
  );

export const researchGoogleKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(googleKeywordIdeasSchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).researchGoogle(data, context),
  );
