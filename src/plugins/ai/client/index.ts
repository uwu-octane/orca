import type { Context } from "cordis";
import { AiProviderSettings } from "./AiProviderSettings";
import { GatewayModelPicker } from "./GatewayModelPicker";

export const name = "ai";
export const inject = ["locale"];
declare module "cordis" {
  interface Context {
    aiSettings: {
      ProviderSettings: typeof AiProviderSettings;
      ModelPicker: typeof GatewayModelPicker;
    };
  }
}
export function apply(ctx: Context) {
  ctx.provide("aiSettings", {
    ProviderSettings: AiProviderSettings,
    ModelPicker: GatewayModelPicker,
  });
}
