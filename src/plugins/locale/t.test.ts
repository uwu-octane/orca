import { beforeEach, describe, expect, it } from "vitest";
import { LOCALE_STORAGE_KEY } from "./locale-settings";
import { setLocaleStorageForTesting, type LocaleStorage } from "./store";
import { translate } from "./t";
import { zh } from "./locales/shell";

function memoryStorage(entries: Record<string, string>): LocaleStorage {
  const data = new Map(Object.entries(entries));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
  };
}

describe("translate", () => {
  beforeEach(() => {
    // zh-active: the dictionary only applies when the preference resolves zh.
    setLocaleStorageForTesting(memoryStorage({ [LOCALE_STORAGE_KEY]: "zh" }));
  });

  it("returns the zh entry for a known key while zh is active", () => {
    expect(translate("Dashboard")).toBe("仪表盘");
  });

  it("passes known keys through as English while en is active", () => {
    setLocaleStorageForTesting(memoryStorage({ [LOCALE_STORAGE_KEY]: "en" }));
    expect(translate("Dashboard")).toBe("Dashboard");
  });

  it("passes known keys through while the preference follows the browser", () => {
    setLocaleStorageForTesting(memoryStorage({}));
    // node's navigator.language is not zh, so system resolves to English.
    expect(translate("Dashboard")).toBe("Dashboard");
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
