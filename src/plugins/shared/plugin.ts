import type { Context } from "cordis";
import { Loader, type EntryOptions } from "@orca/cordis-plugin-loader";
import { createModuleLoader } from "@/plugins/module-map";

/**
 * Boot the plugin tree on a fresh context: loader service, static module
 * resolution, then the manifest entries. Settling the tree rethrows the
 * first failed fiber (or an AggregateError for several), which is the
 * activation audit — a bad config or missing inject dependency fails the
 * boot instead of silently skipping the plugin.
 */
export async function bootPlugins(
  ctx: Context,
  entries: EntryOptions[],
  modules: Record<string, () => Promise<unknown>>,
): Promise<void> {
  await ctx.plugin(Loader);
  ctx.loader.internal = createModuleLoader(modules);
  for (const entry of entries) await ctx.loader.create(entry);
  await ctx.get("loader")?.await();
}
