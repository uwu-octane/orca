/** Only modules supported by the audit Worker's runtime belong in this graph. */
export const auditModules: Record<string, () => Promise<unknown>> = {
  "seo-data": () => import("@/plugins/seo-data"),
  dataforseo: () => import("@/plugins/dataforseo"),
};
