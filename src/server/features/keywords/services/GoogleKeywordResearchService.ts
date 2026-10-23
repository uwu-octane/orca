// FORK: Google grant and connection operations resolve the installed plugin.
import { getGoogleOAuth, getGoogleAds } from "@/plugins/server/context";
import {
  buildCacheKey,
  CACHE_TTL,
  getCached,
  setCached,
} from "@/server/lib/r2-cache";
import {
  googleKeywordIdeasSchema,
  googleKeywordResultSchema,
  type GoogleKeywordIdeasInput,
} from "@/types/schemas/google-keywords";

import { GoogleKeywordRepository } from "../repositories/GoogleKeywordRepository";

async function research(
  input: GoogleKeywordIdeasInput,
  context: { organizationId: string; projectId: string },
) {
  const request = googleKeywordIdeasSchema.parse({
    ...input,
    projectId: context.projectId,
  });
  const config = await (await getGoogleOAuth()).ads.credentials(context);
  const key = await buildCacheKey("kw:google-ads", {
    provider: "google_ads",
    version: "v25:oauth:1",
    organizationId: context.organizationId,
    ...request,
    customerId: config.customerId,
    loginCustomerId: config.loginCustomerId,
    principal: config.googleAccountId,
    grantOwner: config.connectedByUserId,
    connectionRevision: config.updatedAt,
  });
  const cached = googleKeywordResultSchema.safeParse(await getCached(key));
  if (cached.success) {
    await GoogleKeywordRepository.upsertResult(
      request,
      config.customerId,
      cached.data,
    );
    return cached.data;
  }

  const result = googleKeywordResultSchema.parse(
    await (await getGoogleAds()).keywordIdeas(request, config),
  );
  await setCached(key, result, CACHE_TTL.researchResult);
  await GoogleKeywordRepository.upsertResult(
    request,
    config.customerId,
    result,
  );
  return result;
}

export const GoogleKeywordResearchService = { research };
