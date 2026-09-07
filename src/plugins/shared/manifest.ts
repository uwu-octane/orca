import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { EntryOptions } from "@orca/cordis-plugin-loader";

/**
 * Manifest rows are loader entry options; the manifest is a trust boundary
 * (it ships config into plugin code), so it is validated with Zod before
 * boot. Unknown fields are rejected rather than passed through. `inject` is
 * deliberately unsupported until a plugin needs it (billing phase).
 */
const nonBlankString = z.string().refine((value) => value.trim().length > 0, {
  message: "Must not be blank",
});

const entrySchema = z.strictObject({
  id: nonBlankString,
  name: nonBlankString,
  config: z.unknown().optional(),
  disabled: z.boolean().optional(),
});

const entryListSchema = z.array(entrySchema).superRefine((entries, ctx) => {
  const ids = new Set<string>();
  entries.forEach((entry, index) => {
    if (ids.has(entry.id)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "id"],
        message: `Duplicate plugin entry id: ${entry.id}`,
      });
    }
    ids.add(entry.id);
  });
});

const pluginManifestSchema = z.strictObject({
  server: entryListSchema.default([]),
  client: entryListSchema.default([]),
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

/** Apply the same validation to programmatic boot entries and YAML rows. */
export function validatePluginEntries(entries: EntryOptions[]): EntryOptions[] {
  return entryListSchema.parse(entries).map(toEntry);
}

export function parsePluginManifest(yamlText: string): PluginManifest {
  const raw = pluginManifestSchema.parse(parseYaml(yamlText));
  return { server: raw.server.map(toEntry), client: raw.client.map(toEntry) };
}
