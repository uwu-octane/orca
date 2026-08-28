import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Context as CordisContext } from "cordis";
import {
  createClientContext,
  getClientBoot,
} from "@/plugins/client/client-context";
import { translate } from "@/plugins/locale";
import type { LocaleId, LocalePreference, T } from "@/plugins/locale";

interface ClientCordisState {
  ctx: CordisContext;
  /** True once the tree has booted (or failed) — flips the context object
   * identity so consumers mounted during the async boot window re-render
   * and re-subscribe to the real services. */
  settled: boolean;
}

const CordisCtx = createContext<ClientCordisState | null>(null);

/**
 * Mounts the client plugin tree. Lives inside `ClientOnly` in __root.tsx.
 * Fiber activation is async, so the first render happens before any service
 * exists; `useLocale` tolerates that window (English fallback) and the
 * settled flip re-subscribes mounted hooks once boot completes.
 */
export function CordisProvider({ children }: { children: React.ReactNode }) {
  const [ctx] = useState(createClientContext);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getClientBoot().then(() => {
      if (mounted) setSettled(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // A stable ctx alone would short-circuit context propagation (React skips
  // consumers when the value is Object.is-equal), so settled lives in the
  // value itself.
  const value = useMemo(() => ({ ctx, settled }), [ctx, settled]);

  return <CordisCtx.Provider value={value}>{children}</CordisCtx.Provider>;
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
