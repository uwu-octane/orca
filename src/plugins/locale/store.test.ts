import { afterEach, describe, expect, it } from "vitest";
import {
  readActiveLocale,
  readLocalePreference,
  setLocalePreference,
  setLocaleStorageForTesting,
  type LocaleStorage,
} from "./store";
import { resolveActiveLocale } from "./locale-settings";

function memoryStorage(): LocaleStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
  };
}

afterEach(() => {
  setLocaleStorageForTesting({
    get: () => null,
    set: () => {},
  });
});

describe("locale store", () => {
  it("defaults to system preference", () => {
    const storage = memoryStorage();
    setLocaleStorageForTesting(storage);
    expect(readLocalePreference()).toBe("system");
  });

  it("persists an explicit preference and reads it back", () => {
    const storage = memoryStorage();
    setLocaleStorageForTesting(storage);
    setLocalePreference("zh");
    expect(storage.values.get("locale-preference")).toBe("zh");
    expect(readLocalePreference()).toBe("zh");
  });

  it("resolves active locale from preference over browser language", () => {
    const storage = memoryStorage();
    setLocaleStorageForTesting(storage);
    setLocalePreference("en");
    expect(readActiveLocale()).toBe("en");
    setLocalePreference("zh");
    expect(readActiveLocale()).toBe("zh");
  });
});

describe("resolveActiveLocale", () => {
  it("follows the browser language under system preference", () => {
    expect(resolveActiveLocale("system", "zh-CN")).toBe("zh");
    expect(resolveActiveLocale("system", "zh-TW")).toBe("zh");
    expect(resolveActiveLocale("system", "en-US")).toBe("en");
    expect(resolveActiveLocale("system", undefined)).toBe("en");
  });

  it("wins over the browser when explicit", () => {
    expect(resolveActiveLocale("en", "zh-CN")).toBe("en");
    expect(resolveActiveLocale("zh", "en-US")).toBe("zh");
  });
});
