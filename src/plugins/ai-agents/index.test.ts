import { Context } from "cordis";
import { expect, it } from "vitest";
import AiAgentsService from ".";

it("selects the configured dimension implementation and releases it with its plugin", async () => {
  const ctx = new Context();
  try {
    await ctx.plugin(AiAgentsService, {
      keywordDimensions: "alternative-runtime",
    });
    const provider = ctx.plugin({
      inject: ["aiAgents"],
      apply(plugin: Context) {
        plugin.aiAgents.register({
          id: "alternative-runtime",
          generate: async () => ({
            dimensions: [{ name: "Product", children: ["Category"] }],
          }),
        });
      },
    });
    await provider;
    const input = {
      projectId: "project-1",
      language: "en" as const,
      keywords: ["coffee"],
    };
    const scope = { projectId: "project-1", organizationId: "org-1" };
    expect(await ctx.aiAgents.generateKeywordDimensions(input, scope)).toEqual({
      dimensions: [{ name: "Product", children: ["Category"] }],
    });
    await provider.dispose();
    await expect(
      ctx.aiAgents.generateKeywordDimensions(input, scope),
    ).rejects.toThrow(/not registered/);
  } finally {
    await ctx.fiber.dispose();
  }
});
