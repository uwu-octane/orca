import { LOCALE_STORAGE_KEY } from "../locale-settings";

/**
 * FOUC guard: sets `<html lang>` before first paint so a11y tooling,
 * `:lang()` selectors, and (phase 4) Intl defaults match the persisted
 * preference. Same shape as themePreferenceInitScript in
 * src/client/lib/theme.ts. The `translate="no"` attribute and notranslate
 * meta stay untouched — they disable browser machine translation, not
 * dict-based switching.
 */
export const localeInitScript = `(() => {
  try {
    var p = window.localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});
    var lang;
    if (p === "zh") lang = "zh-CN";
    else if (p === "en") lang = "en";
    else lang = (navigator.language || "").toLowerCase().indexOf("zh") === 0 ? "zh-CN" : "en";
    document.documentElement.lang = lang;
  } catch {
    document.documentElement.lang = "en";
  }
})();`;
