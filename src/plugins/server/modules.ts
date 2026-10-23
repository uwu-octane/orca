/** Server-only plugin imports; never imported by the client assembly. */
export const serverModules: Record<string, () => Promise<unknown>> = {
  "google-oauth": () => import("@/plugins/google-oauth/server"),
  "google-ads": () => import("@/plugins/google-ads"),
  "ai-models": () => import("@/plugins/ai-models"),
  "ai-agents": () => import("@/plugins/ai-agents"),
  "keyword-dimension-agent": () => import("@/plugins/keyword-dimension-agent"),
  "vercel-gateway": () => import("@/plugins/vercel-gateway"),
  systemone: () => import("@/plugins/systemone"),
  "seo-data": () => import("@/plugins/seo-data"),
  dataforseo: () => import("@/plugins/dataforseo"),
};
