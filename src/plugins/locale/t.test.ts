import { WEEKDAYS } from "@/client/features/rank-tracking/scheduleTime";
import { TAG_COLOR_KEYS } from "@/shared/tag-colors";
import { countBy } from "remeda";
import { beforeEach, describe, expect, it } from "vitest";
import { LOCALE_STORAGE_KEY } from "./locale-settings";
import { setLocaleStorageForTesting, type LocaleStorage } from "./store";
import { translate } from "./t";
import { zh } from "./locales/zh";
import {
  connectNavGroup,
  getProjectNavGroups,
} from "@/client/navigation/items";
import { setupSteps } from "@/client/features/dashboard/dashboardSteps";
import { INTENT_LABELS } from "@/client/features/keywords/components/IntentBadge";

function memoryStorage(entries: Record<string, string>): LocaleStorage {
  const data = new Map(Object.entries(entries));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
  };
}

function placeholders(text: string) {
  return countBy([...text.matchAll(/\{(\w+)\}/g)], (match) => match[1]);
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

  it("translates all current navigation labels and groups", () => {
    const groups = [...getProjectNavGroups("test-project"), connectNavGroup];
    for (const group of groups) {
      for (const label of [
        group.label,
        ...group.items.map((item) => item.label),
      ]) {
        expect(translate(label), `untranslated navigation: ${label}`).not.toBe(
          label,
        );
      }
    }
  });

  it("translates every selectable tag color", () => {
    for (const color of TAG_COLOR_KEYS) {
      expect(translate(color), `untranslated tag color: ${color}`).not.toBe(
        color,
      );
    }
  });

  it("translates schedule weekdays and UTC abbreviations", () => {
    for (const day of WEEKDAYS) {
      for (const label of [day, day.slice(0, 3)]) {
        expect(translate(label), `untranslated weekday: ${label}`).not.toBe(
          label,
        );
      }
    }
  });

  it("translates setup steps and search intent labels", () => {
    const labels = [
      ...setupSteps.flatMap((step) => [step.label, step.detail]),
      ...Object.values(INTENT_LABELS),
    ];
    for (const label of labels) {
      expect(translate(label), `untranslated label: ${label}`).not.toBe(label);
    }
  });

  it("preserves interpolation parameters in every Chinese translation", () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(placeholders(value), `translation parameters: ${key}`).toEqual(
        placeholders(key),
      );
    }
  });
});
