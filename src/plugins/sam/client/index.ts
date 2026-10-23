import type { Context } from "cordis";
import { SamChat } from "./SamChat";
import { SamSidebarPanel } from "./SamSidebarPanel";
import { createBetaPreference, type SamBetaPreference } from "./betaPreference";

export const name = "sam";
export const inject = ["locale"];
export interface SamViews {
  Chat: typeof SamChat;
  Sidebar: typeof SamSidebarPanel;
  beta: SamBetaPreference;
}
declare module "cordis" {
  interface Context {
    samUi: SamViews;
  }
}
export function apply(ctx: Context) {
  ctx.provide("samUi", {
    Chat: SamChat,
    Sidebar: SamSidebarPanel,
    beta: createBetaPreference(ctx, () => localStorage),
  });
}
