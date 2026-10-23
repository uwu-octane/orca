import type { Context } from "cordis";
import { captureClientEvent } from "@/client/lib/posthog";

export interface SamBetaPreference {
  read: () => boolean;
  subscribe: (listener: () => void) => () => void;
  optIn: () => void;
}

/** Browser preference and subscriptions belong to this plugin activation. */
export function createBetaPreference(
  ctx: Context,
  storage: () => Pick<Storage, "getItem" | "setItem">,
): SamBetaPreference {
  const key = "sam-beta-opt-in";
  const listeners = new Set<() => void>();
  let optedInThisSession = false;
  let active = true;
  ctx.effect(() => () => {
    active = false;
    optedInThisSession = false;
    listeners.clear();
  });
  return {
    read() {
      if (!active) return false;
      if (optedInThisSession) return true;
      try {
        return storage().getItem(key) === "1";
      } catch {
        return false;
      }
    },
    subscribe(listener) {
      if (!active) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    optIn() {
      if (!active) throw new Error("SAM plugin is not active");
      optedInThisSession = true;
      try {
        storage().setItem(key, "1");
      } catch {
        /* Preserve the existing in-memory opt-in when storage is unavailable. */
      }
      captureClientEvent("sam:beta_opt_in");
      for (const listener of listeners) listener();
    },
  };
}
