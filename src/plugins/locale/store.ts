import {
  isLocalePreference,
  LOCALE_CHANGE_EVENT,
  LOCALE_STORAGE_KEY,
  resolveActiveLocale,
  type LocaleId,
  type LocalePreference,
} from "./locale-settings";

/**
 * Locale preference store, mirroring src/client/lib/theme.ts: module-level
 * state over localStorage with a change event and cross-tab sync. Storage is
 * injectable so the node test environment needs no jsdom; the default
 * backend only touches `window` when called (never at import time).
 */

export interface LocaleStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const browserStorage: LocaleStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // private mode / storage disabled — the in-memory preference still
      // applies for this tab
    }
  },
};

let storage: LocaleStorage = browserStorage;

/** Test seam (vitest runs in node). */
export function setLocaleStorageForTesting(next: LocaleStorage): void {
  storage = next;
}

export function readLocalePreference(): LocalePreference {
  const stored = storage.get(LOCALE_STORAGE_KEY);
  return isLocalePreference(stored) ? stored : "system";
}

export function readActiveLocale(): LocaleId {
  return resolveActiveLocale(
    readLocalePreference(),
    typeof navigator !== "undefined" ? navigator.language : undefined,
  );
}

export function setLocalePreference(preference: LocalePreference): void {
  storage.set(LOCALE_STORAGE_KEY, preference);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }
}

/** Subscribe to locale changes (own tab + cross-tab). Returns a disposer. */
export function subscribeToLocale(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
