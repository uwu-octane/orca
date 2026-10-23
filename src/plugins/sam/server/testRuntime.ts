import { createAiTestRuntime } from "@/plugins/ai/server/testRuntime";
import SamService from ".";

export async function createSamTestRuntime() {
  const ctx = await createAiTestRuntime();
  await ctx.plugin(SamService);
  return ctx;
}
