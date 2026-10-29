import {
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import {
  runtime,
  input,
  context,
  mocks,
  result,
} from "./googleKeywordTestSetup";
import AiService from "@/plugins/ai/server";

let decide: MockInstance<AiService["decide"]>;

beforeAll(async () => {
  await runtime.plugin(AiService, { textProvider: "vercel_gateway" });
});
beforeEach(() => {
  decide = vi
    .spyOn(runtime.ai, "decide")
    .mockImplementation(async (payload) => ({
      model: "openai-decisions-release",
      provider: "vercel_gateway",
      requestedModel: "openai/gpt-6-luna-decisions",
      configRevision: "revision",
      durationMs: 1,
      usage: { input_tokens: 100, output_tokens: 0 },
      answers: Object.fromEntries(
        Object.keys(payload.questions)
          // oxlint-disable-next-line unicorn/no-array-reverse -- The project targets ES2022; this keys array is newly allocated.
          .reverse()
          .map((name) => [
            name,
            {
              type: "choice",
              choice: name === "k1" ? "informational" : "commercial",
              confidence: 0.7,
              probabilities: {
                informational: 0.1,
                commercial: 0.7,
                transactional: 0.1,
                navigational: 0.05,
                unknown: 0.05,
              },
            },
          ]),
      ),
    }));
});

it("persists a row's intent across reads and cached searches without repeating inference", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const request = {
    projectId: context.projectId,
    searchId: search.searchId,
    keywords: ["coffee"],
  };
  expect(search.rows[0].intentDecision).toBeUndefined();
  const response = await runtime.keywords.classifyIntent(request, context);
  const saved = response.decisions[0];
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
  ).toMatchObject({ intent: saved.intent, model: saved.model });
  expect(
    (await runtime.keywords.getGoogleSearch(search.searchId, context)).result
      .rows[0],
  ).toMatchObject({
    intent: "commercial",
    intentDecision: { intent: saved.intent, model: saved.model },
  });
  expect(
    (await runtime.keywords.classifyIntent(request, context)).decisions,
  ).toEqual([saved]);
  expect(decide).toHaveBeenCalledTimes(1);
});

it("rejects another workspace and keywords outside the saved result before inference", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const request = {
    projectId: context.projectId,
    searchId: search.searchId,
    keywords: ["coffee"],
  };
  await expect(
    runtime.keywords.classifyIntent(request, {
      ...context,
      organizationId: "org-2",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    runtime.keywords.classifyIntent(
      { ...request, keywords: ["coffee", "invented keyword"] },
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
        keywords: ["coffee"],
      },
      context,
    ),
  ).rejects.toThrow("provider unavailable");
  expect(
    (await runtime.keywords.getGoogleSearch(search.searchId, context)).result
      .rows[0].intentDecision,
  ).toBeUndefined();
});

function mockKeywords(count: number) {
  const template = result().rows[0];
  mocks.fetchIdeas.mockResolvedValue(
    result({
      rows: Array.from({ length: count }, (_, i) => ({
        ...template,
        keyword: `coffee ${i}`,
      })),
    }),
  );
}

it("packs 150 keywords into bounded requests, deduplicates, maps named answers and totals usage", async () => {
  mockKeywords(150);
  const search = await runtime.keywords.researchGoogle(input, context);
  const response = await runtime.keywords.classifyIntent(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      keywords: [
        ...search.rows.map((row) => row.keyword),
        search.rows[0].keyword,
      ],
    },
    context,
  );
  expect(decide).toHaveBeenCalledTimes(5);
  expect(
    decide.mock.calls.map(([payload]) => Object.keys(payload.questions).length),
  ).toEqual([32, 32, 32, 32, 22]);
  expect(response.decisions).toHaveLength(150);
  expect(response.decisions[1]).toMatchObject({
    keyword: "coffee 1",
    intent: "informational",
  });
  expect(response.decisions[0]).toMatchObject({
    keyword: "coffee 0",
    intent: "commercial",
  });
  expect(response.requestCount).toBe(5);
  expect(response.usage).toEqual({ input_tokens: 500, output_tokens: 0 });
  expect(response.decisions.map((row) => row.keyword)).toEqual(
    search.rows.map((row) => row.keyword),
  );
  expect(
    (
      await runtime.keywords.getGoogleSearch(search.searchId, context)
    ).result.rows.every((row) => row.intentDecision),
  ).toBe(true);
});

it("preserves successful batches after failure and only classifies remaining keywords on retry", async () => {
  mockKeywords(33);
  const search = await runtime.keywords.researchGoogle(input, context);
  const request = {
    projectId: context.projectId,
    searchId: search.searchId,
    keywords: search.rows.map((row) => row.keyword),
  };
  const success = decide.getMockImplementation()!;
  decide
    .mockImplementationOnce(success)
    .mockRejectedValueOnce(new Error("provider unavailable"));
  await expect(
    runtime.keywords.classifyIntent(request, context),
  ).rejects.toThrow("provider unavailable");
  const saved = await runtime.keywords.getGoogleSearch(
    search.searchId,
    context,
  );
  expect(saved.result.rows.filter((row) => row.intentDecision)).toHaveLength(
    32,
  );
  expect(
    (await runtime.keywords.classifyIntent(request, context)).decisions,
  ).toHaveLength(33);
  expect(decide).toHaveBeenCalledTimes(3);
  expect(Object.keys(decide.mock.calls[2][0].questions)).toHaveLength(1);
});

it("does not persist part of a batch with a missing answer", async () => {
  mockKeywords(2);
  const search = await runtime.keywords.researchGoogle(input, context);
  const success = decide.getMockImplementation()!;
  decide.mockImplementationOnce(async (...args) => {
    const response = await success(...args);
    delete response.answers.k1;
    return response;
  });
  await expect(
    runtime.keywords.classifyIntent(
      {
        projectId: context.projectId,
        searchId: search.searchId,
        keywords: search.rows.map((row) => row.keyword),
      },
      context,
    ),
  ).rejects.toMatchObject({ code: "DECISION_INVALID_RESPONSE" });
  expect(
    (
      await runtime.keywords.getGoogleSearch(search.searchId, context)
    ).result.rows.every((row) => !row.intentDecision),
  ).toBe(true);
});
