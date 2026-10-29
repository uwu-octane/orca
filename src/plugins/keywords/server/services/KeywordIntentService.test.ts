import {
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { runtime, input, context } from "./googleKeywordTestSetup";
import AiService from "@/plugins/ai/server";

let decide: MockInstance<AiService["decide"]>;

beforeAll(async () => {
  await runtime.plugin(AiService, { textProvider: "vercel_gateway" });
});
beforeEach(() => {
  decide = vi.spyOn(runtime.ai, "decide").mockResolvedValue({
    model: "openai-decisions-release",
    provider: "vercel_gateway",
    requestedModel: "openai/gpt-6-luna-decisions",
    configRevision: "revision",
    durationMs: 1,
    answers: {
      intent: {
        type: "choice",
        choice: "commercial",
        confidence: 0.7,
        probabilities: {
          informational: 0.1,
          commercial: 0.7,
          transactional: 0.1,
          navigational: 0.05,
          unknown: 0.05,
        },
      },
    },
  });
});

it("persists a row's intent across reads and cached searches without repeating inference", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const request = {
    projectId: context.projectId,
    searchId: search.searchId,
    keyword: "coffee",
  };
  expect(search.rows[0].intentDecision).toBeUndefined();
  const saved = await runtime.keywords.classifyIntent(request, context);
  expect(saved).toMatchObject({
    intent: "commercial",
    model: "openai-decisions-release",
  });
  expect(decide.mock.calls[0]?.[2]).toEqual({
    provider: "vercel_gateway",
    model: "openai/gpt-6-luna-decisions",
  });
  expect(
    (await runtime.keywords.researchGoogle(input, context)).rows[0]
      .intentDecision,
  ).toEqual(saved);
  expect(
    (await runtime.keywords.getGoogleSearch(search.searchId, context)).result
      .rows[0],
  ).toMatchObject({ intent: "commercial", intentDecision: saved });
  expect(await runtime.keywords.classifyIntent(request, context)).toEqual(
    saved,
  );
  expect(decide).toHaveBeenCalledTimes(1);
});

it("rejects another workspace and keywords outside the saved result before inference", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const request = {
    projectId: context.projectId,
    searchId: search.searchId,
    keyword: "coffee",
  };
  await expect(
    runtime.keywords.classifyIntent(request, {
      ...context,
      organizationId: "org-2",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    runtime.keywords.classifyIntent(
      { ...request, keyword: "invented keyword" },
      context,
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(decide).not.toHaveBeenCalled();
});

it("leaves the row unclassified when the decision call fails", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  decide.mockRejectedValue(new Error("provider unavailable"));
  await expect(
    runtime.keywords.classifyIntent(
      {
        projectId: context.projectId,
        searchId: search.searchId,
        keyword: "coffee",
      },
      context,
    ),
  ).rejects.toThrow("provider unavailable");
  expect(
    (await runtime.keywords.getGoogleSearch(search.searchId, context)).result
      .rows[0].intentDecision,
  ).toBeUndefined();
});
