/** Locale preference persisted per device (mirrors the theme preference). */

export const LOCALE_STORAGE_KEY = "locale-preference";
export const LOCALE_CHANGE_EVENT = "locale-preference-change";

/** Active display locale. */
export type LocaleId = "en" | "zh";

/** Explicit user choice; "system" delegates to the browser language. */
export type LocalePreference = "system" | LocaleId;

export const isLocalePreference = (value: unknown): value is LocalePreference =>
  value === "system" || value === "en" || value === "zh";

/** Pure resolution: explicit preference wins; system follows the given
 *  browser language (BCP 47), defaulting to English. */
export function resolveActiveLocale(
  preference: LocalePreference,
  navigatorLanguage: string | undefined,
): LocaleId {
  if (preference !== "system") return preference;
  if (navigatorLanguage?.toLowerCase().startsWith("zh")) return "zh";
  return "en";
}

/** Intl locale (BCP 47) for number/date formatting, derived from the active
 *  locale. Threaded into components by phase 4. */
export function getIntlLocale(active: LocaleId): "en-US" | "zh-CN" {
  return active === "zh" ? "zh-CN" : "en-US";
}
