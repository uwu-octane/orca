import { describe, expect, it } from "vitest";
import type { GoogleKeywordResult } from "@/types/schemas/google-keywords";
import {
  EMPTY_GOOGLE_KEYWORD_FILTERS,
  filterGoogleKeywords,
} from "./googleKeywordFilters";

function row(
  keyword: string,
  metrics: Partial<GoogleKeywordResult["rows"][number]> = {},
): GoogleKeywordResult["rows"][number] {
  return {
    keyword,
    searchVolume: null,
    cpc: null,
    competition: null,
    trend: [],
    closeVariants: [],
    keywordDifficulty: null,
    intent: "unknown",
    classification: { status: "not_requested" },
    ...metrics,
  };
}

describe("Google keyword result filters", () => {
  it("combines all included terms with exclusions, ignoring case", () => {
    const rows = [
      row("Coffee beans"),
      row("Coffee pods"),
      row("Coffee beans jobs"),
      row("Tea beans"),
    ];
    expect(
      filterGoogleKeywords(rows, {
        ...EMPTY_GOOGLE_KEYWORD_FILTERS,
        include: " COFFEE, beans ",
        exclude: "jobs, course",
      }).map((item) => item.keyword),
    ).toEqual(["Coffee beans"]);
  });

  it.each([
    ["searchVolume", "minVol", "maxVol"],
    ["cpc", "minCpc", "maxCpc"],
    ["competition", "minCompetition", "maxCompetition"],
  ] as const)(
    "keeps real zero %s values but excludes missing metrics from numeric ranges",
    (metric, min, max) => {
      const rows = [
        row("unknown"),
        row("zero", { [metric]: 0 }),
        row("one", { [metric]: 1 }),
      ];
      expect(
        filterGoogleKeywords(rows, EMPTY_GOOGLE_KEYWORD_FILTERS),
      ).toHaveLength(3);
      expect(
        filterGoogleKeywords(rows, {
          ...EMPTY_GOOGLE_KEYWORD_FILTERS,
          [min]: "0",
          [max]: "0",
        }).map((item) => item.keyword),
      ).toEqual(["zero"]);
      expect(
        filterGoogleKeywords(rows, {
          ...EMPTY_GOOGLE_KEYWORD_FILTERS,
          [min]: "1",
        }).map((item) => item.keyword),
      ).toEqual(["one"]);
    },
  );
});
