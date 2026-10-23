import { Context } from "cordis";
import { bootPlugins } from "@/plugins/shared/plugin";
import { parsePluginManifest } from "@/plugins/shared/manifest";
import { auditModules } from "./modules";
import manifestYaml from "./manifest.yaml?raw";

let boot: Promise<Context> | undefined;

/** Independent Worker composition: no application routes or cookie middleware. */
export function getAuditContext(): Promise<Context> {
  boot ??= (async () => {
    const ctx = new Context();
    try {
      await bootPlugins(
        ctx,
        parsePluginManifest(manifestYaml).server,
        auditModules,
      );
      ctx.seoData.validateRoutes();
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
