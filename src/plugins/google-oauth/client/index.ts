import { createLinkFlow, type GoogleLinkFlow } from "./linkFlow";
import type { Context } from "cordis";
import { GoogleConnectionCard } from "./GoogleConnectionCard";
import { SearchConsoleOnboardingStep } from "./SearchConsoleOnboardingStep";

export const name = "google-oauth";
export const inject = ["locale"];

export type GoogleConnectionViews = {
  link: GoogleLinkFlow;
  ConnectionCard: typeof GoogleConnectionCard;
  OnboardingStep: typeof SearchConsoleOnboardingStep;
};

declare module "cordis" {
  interface Context {
    googleConnections: GoogleConnectionViews;
  }
}

export function apply(ctx: Context) {
  ctx.provide("googleConnections", {
    link: createLinkFlow(ctx),
    ConnectionCard: GoogleConnectionCard,
    OnboardingStep: SearchConsoleOnboardingStep,
  });
}
