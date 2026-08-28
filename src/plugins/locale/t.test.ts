import { describe, expect, it } from "vitest";
import { translate } from "./t";
import { zh } from "./locales/shell";

describe("translate", () => {
  it("returns the zh entry for a known key", () => {
    expect(translate("Dashboard")).toBe("仪表盘");
  });

  it("interpolates {param} placeholders", () => {
    expect(
      translate("Page {page} of {totalPages}", { page: 2, totalPages: 7 }),
    ).toBe("第 2 / 7 页");
  });

  it("passes unknown keys through as English", () => {
    expect(translate("Some deep-feature string")).toBe(
      "Some deep-feature string",
    );
  });

  it("leaves unmatched placeholders untouched", () => {
    expect(translate("Page {page} of {totalPages}", { page: 3 })).toBe(
      "第 3 / {totalPages} 页",
    );
  });

  it("keeps the shell dictionary complete for the nav labels it covers", () => {
    // Dynamic call sites (t(item.label)) are not type-checked; this test
    // guards the dictionary against drift in src/client/navigation/items.ts.
    const navLabels = [
      "AI & MCP",
      "Backlinks",
      "Brand Lookup",
      "Connect",
      "Dashboard",
      "Domain Overview",
      "GSC Insights",
      "Keyword Research",
      "My Site",
      "Overview",
      "Prompt Explorer",
      "Rank Tracking",
      "Research",
      "Saved Keywords",
      "Site Audit",
    ] as const;
    for (const label of navLabels) {
      expect(
        zh[label],
        `missing zh entry for nav label "${label}"`,
      ).toBeTruthy();
    }
  });
});
