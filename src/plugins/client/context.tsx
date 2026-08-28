import { createContext, useState } from "react";
import type { Context as CordisContext } from "cordis";
import { createClientContext } from "@/plugins/client/client-context";

const CordisCtx = createContext<CordisContext | null>(null);

/** Mounts the client plugin tree. Lives inside `ClientOnly` in __root.tsx. */
export function CordisProvider({ children }: { children: React.ReactNode }) {
  const [ctx] = useState(createClientContext);
  return <CordisCtx.Provider value={ctx}>{children}</CordisCtx.Provider>;
}
// useService / useLocale land in phase 2, with the locale plugin as their
// first consumer.
