import { Context } from "cordis";
import { serverModules } from "@/plugins/server/modules";
import { bootPlugins } from "@/plugins/shared/plugin";
import { parsePluginManifest } from "@/plugins/shared/manifest";
import manifestYaml from "@/plugins/manifest.yaml?raw";

let boot: Promise<Context> | undefined;

/**
 * Lazy module-scope singleton for the server plugin tree. Booted on the
 * first request; a failed boot resets the memo so the next request retries.
 *
 * Services must be stateless — request-scoped data travels as function
 * arguments through the existing server-function path. When a service needs
 * per-request state, the handler will boot a child scope with `ctx.isolate`
 * (documented evolution path in docs/PLUGINS.md, not built).
 */
export function getAppContext(): Promise<Context> {
  boot ??= (async () => {
    const manifest = parsePluginManifest(manifestYaml);
    const ctx = new Context();
    try {
      await bootPlugins(ctx, manifest.server, serverModules);
      ctx.get("seoData")?.validateRoutes();
      ctx.get("aiModels")?.validateRoutes();
      ctx.get("aiAgents")?.validateRoutes();
      return ctx;
    } catch (error) {
      await ctx.fiber.dispose();
      throw error;
    }
  })().catch((error) => {
    boot = undefined;
    throw error;
  });
  return boot;
}

/** Resolves within any Worker invocation, including Workflow and DO calls. */
export async function getSeoData() {
  const service = (await getAppContext()).get("seoData");
  if (!service) throw new Error("SEO data service is not configured");
  return service;
}

/** Compatibility calls still require the explicitly installed vendor plugin. */
export async function getDataforseoProvider() {
  const provider = (await getAppContext()).get("dataforseo");
  if (!provider) throw new Error("DataForSEO plugin is not configured");
  return provider;
}

export async function getAiModels() {
  const service = (await getAppContext()).get("aiModels");
  if (!service) throw new Error("AI model service is not configured");
  return service;
}

export async function getAiAgents() {
  const service = (await getAppContext()).get("aiAgents");
  if (!service) throw new Error("AI agent service is not configured");
  return service;
}

export async function getGoogleOAuth() {
  const service = (await getAppContext()).get("googleOAuth");
  if (!service) throw new Error("Google OAuth plugin is not configured");
  return service;
}

export async function getGoogleAds() {
  const service = (await getAppContext()).get("googleAds");
  if (!service) throw new Error("Google Ads plugin is not configured");
  return service;
}
