import { Context } from "cordis";
import { clientModules } from "@/plugins/module-map";
import { bootPlugins } from "@/plugins/shared/plugin";
import { parsePluginManifest } from "@/plugins/shared/manifest";
import manifestYaml from "@/plugins/manifest.yaml?raw";

let clientContext: Context | undefined;
let clientBoot: Promise<void> | undefined;

/**
 * Client-side plugin context, created once on first provider mount. The
 * provider lives inside the ClientOnly subtree, so this never runs during
 * the SSR pass. Boot failures are logged and the app renders without the
 * plugin tree (a broken plugin must not take down the UI).
 */
export function createClientContext(): Context {
  if (!clientContext) {
    const manifest = parsePluginManifest(manifestYaml);
    const ctx = new Context();
    clientBoot = bootPlugins(ctx, manifest.client, clientModules).catch(
      (error) => {
        console.error("plugin boot failed:", error);
      },
    );
    clientContext = ctx;
  }
  return clientContext;
}

/**
 * Settles (never rejects) once the client tree has booted or failed. The
 * provider re-renders on this so hooks that mounted during the async boot
 * window re-subscribe to the real services.
 */
export function getClientBoot(): Promise<void> {
  return clientBoot ?? Promise.resolve();
}
