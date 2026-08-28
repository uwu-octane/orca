import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import type { Context as CordisContext } from "cordis";
import { createClientContext } from "@/plugins/client/client-context";
import type { LocaleId, LocalePreference, T } from "@/plugins/locale";

const CordisCtx = createContext<CordisContext | null>(null);

/** Mounts the client plugin tree. Lives inside `ClientOnly` in __root.tsx. */
export function CordisProvider({ children }: { children: React.ReactNode }) {
  const [ctx] = useState(createClientContext);
  return <CordisCtx.Provider value={ctx}>{children}</CordisCtx.Provider>;
}

/** Reads a plugin service from the client tree. */
function useService<S extends keyof CordisContext>(name: S): CordisContext[S] {
  const ctx = useContext(CordisCtx);
  if (!ctx) {
    throw new Error(
      `useService("${String(name)}") called outside <CordisProvider>`,
    );
  }
  return ctx[name];
}

/**
 * Locale hook: reactively translates through the locale plugin's store.
 * The server snapshot stays "en" (the app subtree never SSR-renders, but
 * useSyncExternalStore requires an honest contract).
 */
export function useLocale(): {
  t: T;
  active: LocaleId;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
} {
  const locale = useService("locale");
  const active = useSyncExternalStore(
    (onChange) => locale.subscribe(onChange),
    () => locale.active,
    (): LocaleId => "en",
  );
  const preference = useSyncExternalStore(
    (onChange) => locale.subscribe(onChange),
    () => locale.preference,
    (): LocalePreference => "system",
  );
  return {
    t: locale.t,
    active,
    preference,
    setPreference: (pref) => locale.setPreference(pref),
  };
}
