import type { ModuleLoaderLike } from "@orca/cordis-plugin-loader";

/**
 * Static plugin module resolution: manifest names → dynamic imports.
 * Assembly (enable/disable/config) is runtime; resolution is compile-time
 * because workerd has no filesystem. One map per side keeps the other
 * side's chunks out of the bundle.
 */

export const serverModules: Record<string, () => Promise<unknown>> = {};

export const clientModules: Record<string, () => Promise<unknown>> = {
  locale: () => import("@/plugins/locale"),
};

/** Minimal module-loader shape backed by a static map. */
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
