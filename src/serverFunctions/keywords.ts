import { createServerFn } from "@tanstack/react-start";
import {
  deleteSavedKeywordTagSchema,
  researchKeywordsSchema,
  saveKeywordsSchema,
  getSavedKeywordsSchema,
  exportSavedKeywordsSchema,
  removeSavedKeywordsSchema,
  refreshSavedKeywordMetricsSchema,
  serpAnalysisSchema,
  updateSavedKeywordTagSchema,
  updateSavedKeywordTagsSchema,
} from "@/types/schemas/keywords";
// FORK: business operations resolve the installed Keywords domain.
import { getKeywords } from "@/plugins/server/context";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { resolveMarket } from "@/shared/keyword-locations";

function shouldUseKeywordE2eFixtures() {
  return import.meta.env.VITE_E2E_KEYWORD_FIXTURES === "1";
}

async function getKeywordE2eFixtures() {
  return import("../../tests/fixtures/keyword-research-fixtures");
}

export const researchKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(researchKeywordsSchema)
  .handler(async ({ data, context }) => {
    const input = {
      ...data,
      ...resolveMarket(data, context.project),
      projectId: context.projectId,
    };
    if (shouldUseKeywordE2eFixtures()) {
      const fixtures = await getKeywordE2eFixtures();
      return fixtures.getKeywordResearchFixture(input);
    }

    return (await getKeywords()).research(input, context);
  });

export const saveKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(saveKeywordsSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).saveKeywords({
      ...data,
      ...resolveMarket(data, context.project),
      projectId: context.projectId,
    });
  });

export const getSavedKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(getSavedKeywordsSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).getSavedKeywords({
      ...data,
      projectId: context.projectId,
    });
  });

export const exportSavedKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(exportSavedKeywordsSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).exportSavedKeywords({
      ...data,
      projectId: context.projectId,
    });
  });

export const updateSavedKeywordTags = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(updateSavedKeywordTagsSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).updateSavedKeywordTags({
      ...data,
      projectId: context.projectId,
    });
  });

export const updateSavedKeywordTag = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(updateSavedKeywordTagSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).updateSavedKeywordTag({
      ...data,
      projectId: context.projectId,
    });
  });

export const deleteSavedKeywordTag = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(deleteSavedKeywordTagSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).deleteSavedKeywordTag({
      ...data,
      projectId: context.projectId,
    });
  });

export const removeSavedKeywords = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(removeSavedKeywordsSchema)
  .handler(async ({ data, context }) => {
    return (await getKeywords()).removeSavedKeywords(context.projectId, data);
  });

export const refreshSavedKeywordMetrics = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(refreshSavedKeywordMetricsSchema)
  .handler(async ({ context }) => {
    return (await getKeywords()).refreshSavedKeywordMetrics(
      { projectId: context.projectId },
      context,
    );
  });

export const getSerpAnalysis = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(serpAnalysisSchema)
  .handler(async ({ data, context }) =>
    (await getKeywords()).getSerpAnalysis(
      {
        ...data,
        ...resolveMarket(data, context.project),
        projectId: context.projectId,
      },
      context,
    ),
  );
