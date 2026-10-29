import { expect, it, vi } from "vitest";
import {
  runtime,
  database,
  mocks,
  input,
  context,
  result,
} from "./googleKeywordTestSetup";
import { Context } from "cordis";
import KeywordsService from "@/plugins/keywords/server";
import AiService from "@/plugins/ai/server";
import SamService from "@/plugins/sam/server";
import { makeToolContext } from "@/server/mcp/tools/tool-test-support";
import type { KeywordDimension } from "@/types/schemas/keyword-dimensions";

function taxonomy(): KeywordDimension[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Equipment",
      labelZh: "设备",
      children: [
        {
          id: crypto.randomUUID(),
          name: "Coffee makers",
          labelZh: "咖啡机",
          active: true,
          decision: {
            instructions:
              "Does the keyword explicitly refer to a coffee maker?",
            criteria: {
              true: "The keyword names a coffee maker or espresso machine.",
              false:
                "Only beans, accessories, a brand, or an ambiguous root term.",
            },
          },
        },
        {
          id: crypto.randomUUID(),
          name: "Grinders",
          labelZh: "磨豆机",
          active: false,
          decision: { instructions: "Does the keyword name a coffee grinder?" },
        },
      ],
    },
  ];
}

it("restores the exact search page after cache expiry and newer metric updates", async () => {
  const first = await runtime.keywords.researchGoogle(input, context);
  mocks.cache.clear();
  mocks.fetchIdeas.mockResolvedValue(
    result({
      fetchedAt: "2026-10-23T00:00:00.000Z",
      rows: [{ ...result().rows[0], searchVolume: 100 }],
    }),
  );
  const second = await runtime.keywords.researchGoogle(input, context);
  expect(second.searchId).not.toBe(first.searchId);
  expect(
    await runtime.keywords.getGoogleSearch(first.searchId, context),
  ).toEqual({ input, result: first });
  expect(
    (await runtime.keywords.getGoogleSearch(second.searchId, context)).result
      .rows[0].searchVolume,
  ).toBe(100);
});

it("persists edits and activation for reloaded pages and SAM without supplier dependencies", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const initial = await runtime.keywords.saveDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      dimensions: taxonomy(),
    },
    context,
  );
  const edited = initial.dimensions.map((dimension) => ({
    ...dimension,
    labelZh: "咖啡设备",
    children: dimension.children.map((child) => ({
      ...child,
      active: !child.active,
    })),
  }));
  const saved = await runtime.keywords.saveDimensions(
    { ...initial, projectId: context.projectId, dimensions: edited },
    context,
  );
  // Repeating a cached search never overwrites operator edits.
  expect((await runtime.keywords.researchGoogle(input, context)).searchId).toBe(
    search.searchId,
  );
  const fresh = new Context();
  try {
    await fresh.plugin(KeywordsService);
    await fresh.plugin(AiService, { textProvider: "vercel_gateway" });
    await fresh.plugin(SamService);
    expect(
      await fresh.keywords.getSavedDimensions(search.searchId, context),
    ).toEqual(saved);
    const tools = await fresh.sam.buildTools({
      auth: makeToolContext({ organizationId: "org-1" }).auth,
      project: { id: "project-1", domain: null },
    });
    const read: unknown = await tools.get_keyword_dimensions.execute!(
      { searchId: search.searchId },
      { toolCallId: "read", messages: [] },
    );
    expect(read).toMatchObject({
      ...saved,
      keywords: ["coffee"],
      decisionDimensions: [
        {
          id: saved.dimensions[0].id,
          name: "Equipment",
          children: [
            { id: saved.dimensions[0].children[1].id, name: "Grinders" },
          ],
        },
      ],
    });
    const listed: unknown = await tools.list_keyword_searches.execute!(
      {},
      { toolCallId: "list", messages: [] },
    );
    expect(listed).toMatchObject([
      {
        searchId: search.searchId,
        keywords: ["coffee"],
        geoTargetIds: ["2840"],
        languageId: "1000",
        network: "GOOGLE_SEARCH",
        includeAdultKeywords: false,
        pageSize: 150,
      },
    ]);
    expect(mocks.fetchIdeas).toHaveBeenCalledTimes(1);
  } finally {
    await fresh.fiber.dispose();
  }
});

it("isolates saved searches and dimension writes by project and organization", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const saved = await runtime.keywords.saveDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      dimensions: taxonomy(),
    },
    context,
  );
  for (const scope of [
    { ...context, organizationId: "org-2" },
    { projectId: "project-2", organizationId: "org-2" },
  ]) {
    await expect(
      runtime.keywords.getGoogleSearch(search.searchId, scope),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      runtime.keywords.getSavedDimensions(search.searchId, scope),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      runtime.keywords.saveDimensions(
        { ...saved, projectId: scope.projectId, dimensions: [] },
        scope,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await runtime.keywords.listGoogleSearches(scope)).toEqual([]);
  }
  expect(
    await runtime.keywords.getSavedDimensions(search.searchId, context),
  ).toEqual(saved);
});

it("updates and removes independent authored questions", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const dimensions = taxonomy();
  const first = await runtime.keywords.saveDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      dimensions,
    },
    context,
  );
  dimensions[0].children[0].decision = undefined;
  dimensions[0].children[1].decision = {
    instructions: "Does this keyword explicitly mention a manual grinder?",
  };
  const edited = await runtime.keywords.saveDimensions(
    { ...first, projectId: context.projectId, dimensions },
    context,
  );
  const reloaded = await runtime.keywords.getSavedDimensions(
    search.searchId,
    context,
  );
  expect(reloaded).toEqual(edited);
  expect(reloaded.dimensions[0].children[0].decision).toBeUndefined();
  expect(reloaded.dimensions[0].children[1].decision).toEqual(
    dimensions[0].children[1].decision,
  );
});

it("rejects stale edits and rolls back failed child writes without losing the saved taxonomy", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  const first = await runtime.keywords.saveDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      dimensions: taxonomy(),
    },
    context,
  );
  await expect(
    runtime.keywords.saveDimensions(
      {
        projectId: context.projectId,
        searchId: search.searchId,
        revision: null,
        dimensions: [],
      },
      context,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await database.client.executeMultiple(
    "CREATE TRIGGER reject_subdimension BEFORE INSERT ON keyword_research_subdimensions BEGIN SELECT RAISE(ABORT, 'write unavailable'); END;",
  );
  try {
    await expect(
      runtime.keywords.saveDimensions(
        { ...first, projectId: context.projectId },
        context,
      ),
    ).rejects.toThrow();
    expect(
      await runtime.keywords.getSavedDimensions(search.searchId, context),
    ).toEqual(first);
  } finally {
    await database.client.execute("DROP TRIGGER reject_subdimension");
  }
});

it("does not let a slow generation replace newer edits", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  let submit!: (value: {
    dimensions: {
      name: string;
      labelZh: string;
      children: { name: string; labelZh: string }[];
    }[];
  }) => void;
  let started!: () => void;
  const start = new Promise<void>((resolve) => {
    started = resolve;
  });
  vi.spyOn(runtime.keywords, "generateDimensions").mockImplementation(() => {
    started();
    return new Promise((resolve) => {
      submit = resolve;
    });
  });
  const pending = runtime.keywords.generateSavedDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      language: "zh",
    },
    context,
  );
  await start;
  const saved = await runtime.keywords.saveDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      dimensions: taxonomy(),
    },
    context,
  );
  submit({
    dimensions: [
      {
        name: "Products",
        labelZh: "产品",
        children: [{ name: "Coffee", labelZh: "咖啡" }],
      },
    ],
  });
  await expect(pending).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    await runtime.keywords.getSavedDimensions(search.searchId, context),
  ).toEqual(saved);
});

it("saves generated English fields and Chinese labels against the stored search", async () => {
  const search = await runtime.keywords.researchGoogle(input, context);
  vi.spyOn(runtime.keywords, "generateDimensions").mockResolvedValue({
    dimensions: [
      {
        name: "Equipment",
        labelZh: "设备",
        children: [{ name: "Coffee makers", labelZh: "咖啡机" }],
      },
    ],
  });
  const generated = await runtime.keywords.generateSavedDimensions(
    {
      projectId: context.projectId,
      searchId: search.searchId,
      revision: null,
      language: "zh",
    },
    context,
  );
  expect(generated.dimensions).toMatchObject([
    {
      name: "Equipment",
      labelZh: "设备",
      children: [{ name: "Coffee makers", labelZh: "咖啡机", active: true }],
    },
  ]);
  expect(
    await runtime.keywords.getSavedDimensions(search.searchId, context),
  ).toEqual(generated);
  const cleared = await runtime.keywords.saveDimensions(
    { ...generated, projectId: context.projectId, dimensions: [] },
    context,
  );
  expect(cleared.dimensions).toEqual([]);
  expect(cleared.revision).not.toBe(generated.revision);
});
