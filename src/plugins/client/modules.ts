/** Browser-only plugin imports. */
export const clientModules: Record<string, () => Promise<unknown>> = {
  "google-oauth": () => import("@/plugins/google-oauth/client"),
  locale: () => import("@/plugins/locale"),
};
