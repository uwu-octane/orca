import type { Context } from "cordis";
import { KeywordResearchPage } from "./page/KeywordResearchPage";
import { GoogleKeywordResearchPage } from "./google/GoogleKeywordResearchPage";
import { SavedKeywordsPage } from "./saved/SavedKeywordsPage";

export const name = "keywords";
export const inject = ["locale"];
export interface KeywordViews {
  Research: typeof KeywordResearchPage;
  GoogleResearch: typeof GoogleKeywordResearchPage;
  Saved: typeof SavedKeywordsPage;
}
declare module "cordis" {
  interface Context {
    keywordUi: KeywordViews;
  }
}
export function apply(ctx: Context) {
  ctx.provide("keywordUi", {
    Research: KeywordResearchPage,
    GoogleResearch: GoogleKeywordResearchPage,
    Saved: SavedKeywordsPage,
  });
}
