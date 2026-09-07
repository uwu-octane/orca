/** Server-only plugin imports; never imported by the client assembly. */
export const serverModules: Record<string, () => Promise<unknown>> = {
  "seo-data": () => import("@/plugins/seo-data"),
  dataforseo: () => import("@/plugins/dataforseo"),
};
