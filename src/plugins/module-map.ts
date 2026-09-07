import type { ModuleLoaderLike } from "@orca/cordis-plugin-loader";

/**
 * Static module resolution shared by both runtimes. The actual module maps
 * live in server/modules.ts and client/modules.ts so the client never parses
 * server dynamic imports during bundling.
 */

export function createModuleLoader(
  modules: Record<string, () => Promise<unknown>>,
): ModuleLoaderLike {
  return {
    version: "v1",
    async import(specifier: string) {
      const load = modules[specifier];
      if (!load) throw new Error(`unknown plugin module: ${specifier}`);
      return load();
    },
  };
}
