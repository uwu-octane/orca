import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { EntryOptions } from "@orca/cordis-plugin-loader";

/**
 * Manifest rows are loader entry options; the manifest is a trust boundary
 * (it ships config into plugin code), so it is validated with Zod before
 * boot. Unknown fields are rejected rather than passed through. `inject` is
 * deliberately unsupported until a plugin needs it (billing phase).
 */
const entrySchema = z.object({
  id: z.string(),
  name: z.string(),
  config: z.unknown().optional(),
  disabled: z.boolean().optional(),
});

const pluginManifestSchema = z.object({
  server: z.array(entrySchema).default([]),
  client: z.array(entrySchema).default([]),
});

interface PluginManifest {
  server: EntryOptions[];
  client: EntryOptions[];
}

function toEntry(row: z.infer<typeof entrySchema>): EntryOptions {
  return {
    id: row.id,
    name: row.name,
    ...(row.config !== undefined ? { config: row.config } : {}),
    ...(row.disabled !== undefined ? { disabled: row.disabled } : {}),
  };
}

export function parsePluginManifest(yamlText: string): PluginManifest {
  const raw = pluginManifestSchema.parse(parseYaml(yamlText));
  return { server: raw.server.map(toEntry), client: raw.client.map(toEntry) };
}
