import type { Context } from "cordis";
import {
  readActiveLocale,
  readLocalePreference,
  setLocalePreference,
  subscribeToLocale,
} from "./store";
import { translate, type T } from "./t";
import type { LocaleId, LocalePreference } from "./locale-settings";

export type { LocaleId, LocalePreference } from "./locale-settings";
export { getIntlLocale } from "./locale-settings";
export { readActiveLocale } from "./store";
export { translate, type T } from "./t";

/** Service exposed on the client plugin tree as `ctx.locale`. */
export interface LocaleService {
  readonly active: LocaleId;
  readonly preference: LocalePreference;
  t: T;
  subscribe(onChange: () => void): () => void;
  setPreference(preference: LocalePreference): void;
}

export const name = "locale";

export function apply(ctx: Context): void {
  const service: LocaleService = {
    get active() {
      return readActiveLocale();
    },
    get preference() {
      return readLocalePreference();
    },
    t: translate,
    subscribe: subscribeToLocale,
    setPreference: setLocalePreference,
  };
  ctx.provide("locale", service);
}
