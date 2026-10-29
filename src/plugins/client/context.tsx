import { createContext, useContext, useSyncExternalStore } from "react";
import type { Context as CordisContext } from "cordis";
import { translate } from "@/plugins/locale";
import type { LocaleId, LocalePreference, T } from "@/plugins/locale";

interface ClientCordisState {
  ctx: CordisContext;
  /** True once the tree has booted (or failed) — flips the context object
   * identity so consumers mounted during the async boot window re-render
   * and re-subscribe to the real services. */
  settled: boolean;
}

export const CordisCtx = createContext<ClientCordisState | null>(null);

/** Reads the live client service, including activation and disposal after boot. */
export function useClientService<K extends keyof CordisContext & string>(
  name: K,
) {
  const state = useContext(CordisCtx);
  const ctx = state?.ctx;
  const service = useSyncExternalStore(
    (changed) =>
      ctx
        ? ctx.on("internal/service", (key) => {
            if (key === name) changed();
          })
        : noSubscription(),
    () => ctx?.get(name),
    () => undefined,
  );
  return { service, pending: !state?.settled };
}

/** English passthrough while the tree boots or after it fails. */
const ENGLISH_LOCALE: {
  active: LocaleId;
  preference: LocalePreference;
  t: T;
} = {
  active: "en",
  preference: "system",
  t: translate,
};

function noSubscription(): () => void {
  return () => {};
}

/**
 * Locale hook: reactively translates through the locale plugin's store.
 * `ctx.locale` is undefined while the tree boots, and the provider itself
 * is absent during SSR — the error boundary calls this hook, so it must
 * never throw: both cases fall back to English. The server snapshot stays
 * "en" (the app subtree never SSR-renders, but useSyncExternalStore
 * requires an honest contract).
 */
export function useLocale(): {
  t: T;
  active: LocaleId;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
} {
  const state = useContext(CordisCtx);
  const locale = state?.ctx.locale;
  const active = useSyncExternalStore(
    locale ? (onChange) => locale.subscribe(onChange) : noSubscription,
    () => locale?.active ?? ENGLISH_LOCALE.active,
    (): LocaleId => ENGLISH_LOCALE.active,
  );
  const preference = useSyncExternalStore(
    locale ? (onChange) => locale.subscribe(onChange) : noSubscription,
    () => locale?.preference ?? ENGLISH_LOCALE.preference,
    (): LocalePreference => ENGLISH_LOCALE.preference,
  );
  return {
    t: locale?.t ?? ENGLISH_LOCALE.t,
    active,
    preference,
    setPreference: (pref) => locale?.setPreference(pref),
  };
}
