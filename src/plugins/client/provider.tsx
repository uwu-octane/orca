import { useEffect, useMemo, useState } from "react";
import { createClientContext, getClientBoot } from "./client-context";
import { CordisCtx } from "./context";

// Keep plugin boot imports out of the bindings reused by sandboxed MCP widgets.
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
