import type { Context } from "cordis";
import { AiProviderSettings } from "./AiProviderSettings";

export const name = "ai";
export const inject = ["locale"];
declare module "cordis" {
  interface Context {
    aiSettings: { ProviderSettings: typeof AiProviderSettings };
  }
}
export function apply(ctx: Context) {
  ctx.provide("aiSettings", { ProviderSettings: AiProviderSettings });
}
