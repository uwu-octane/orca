/** Browser-only plugin imports. */
export const clientModules: Record<string, () => Promise<unknown>> = {
  locale: () => import("@/plugins/locale"),
};
