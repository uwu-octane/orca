import { Context } from "cordis";
import { serverModules } from "@/plugins/module-map";
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
    await bootPlugins(ctx, manifest.server, serverModules);
    return ctx;
  })().catch((error) => {
    boot = undefined;
    throw error;
  });
  return boot;
}
