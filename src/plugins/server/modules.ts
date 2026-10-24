/** Server-only plugin imports; never imported by the client assembly. */
export const serverModules: Record<string, () => Promise<unknown>> = {
  keywords: () => import("@/plugins/keywords/server"),
  sam: () => import("@/plugins/sam/server"),
  "google-oauth": () => import("@/plugins/google-oauth/server"),
  "google-ads": () => import("@/plugins/google-ads"),
  ai: () => import("@/plugins/ai/server"),
  "vercel-gateway": () => import("@/plugins/vercel-gateway"),
  systemone: () => import("@/plugins/systemone"),
  "seo-data": () => import("@/plugins/seo-data"),
  dataforseo: () => import("@/plugins/dataforseo"),
};
