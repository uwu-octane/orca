import type { Context, FiberState } from "cordis";
import { Loader, type EntryOptions } from "@orca/cordis-plugin-loader";
import { createModuleLoader } from "@/plugins/module-map";
import { validatePluginEntries } from "@/plugins/shared/manifest";

// Cordis exports an ambient const enum; isolatedModules permits a type-only
// import and its numeric literal, but not a runtime enum member access.
const ACTIVE_FIBER_STATE: FiberState = 2;

/**
 * Boot the plugin tree on a fresh context: loader service, static module
 * resolution, then the manifest entries. Enabled entries must be active
 * after the entire tree settles, including dependencies mounted later in
 * the manifest. Owns cleanup of this fresh context if boot fails.
 */
export async function bootPlugins(
  ctx: Context,
  entries: EntryOptions[],
  modules: Record<string, () => Promise<unknown>>,
): Promise<void> {
  try {
    const validated = validatePluginEntries(entries);
    await ctx.plugin(Loader);
    const loader = ctx.loader;
    loader.internal = createModuleLoader(modules);
    for (const entry of validated) await loader.create(entry);
    await loader.await();

    for (const entry of loader.entries()) {
      if (entry.disabled) continue;
      if (entry.fiber?.state === ACTIVE_FIBER_STATE) continue;
      const dependencies = Object.keys(entry.fiber?.inject ?? {});
      throw new Error(
        `Plugin entry ${entry.id} (${entry.options.name}) did not activate; required services: ${dependencies.join(", ")}`,
      );
    }
  } catch (error) {
    await ctx.fiber.dispose();
    throw error;
  }
}
