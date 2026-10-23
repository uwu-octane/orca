import { Context } from "cordis";
import AiService from ".";
import * as gateway from "@/plugins/vercel-gateway";
import * as systemone from "@/plugins/systemone";
import { bootPlugins } from "@/plugins/shared/plugin";

export async function createAiTestRuntime() {
  const ctx = new Context();
  await bootPlugins(
    ctx,
    [
      { id: "ai", name: "ai", config: { textProvider: "vercel_gateway" } },
      { id: "vercel-gateway", name: "vercel-gateway" },
      { id: "systemone", name: "systemone" },
    ],
    {
      ai: async () => ({ default: AiService }),
      "vercel-gateway": async () => gateway,
      systemone: async () => systemone,
    },
  );
  ctx.ai.validateRoutes();
  return ctx;
}
