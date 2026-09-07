import { describe, expect, it } from "vitest";
import { parsePluginManifest } from "@/plugins/shared/manifest";

describe("parsePluginManifest", () => {
  it.each(["inject: [billing]", "disabeld: true", "group: true"])(
    "rejects unsupported entry fields: %s",
    (field) => {
      expect(() =>
        parsePluginManifest(
          `server:\n  - id: data\n    name: data\n    ${field}`,
        ),
      ).toThrow();
    },
  );

  it("rejects a misspelled manifest section", () => {
    expect(() => parsePluginManifest("sever: []")).toThrow();
  });

  it.each(["id", "name"])("rejects a blank %s", (field) => {
    expect(() =>
      parsePluginManifest(
        JSON.stringify({
          server: [{ id: "data", name: "data", [field]: " " }],
        }),
      ),
    ).toThrow();
  });

  it("rejects duplicate IDs before assembly", () => {
    expect(() =>
      parsePluginManifest(
        "server:\n  - id: data\n    name: first\n  - id: data\n    name: second",
      ),
    ).toThrow(/Duplicate plugin entry id: data/);
  });

  it("allows the same ID on separate sides and preserves plain config", () => {
    const entry = { id: "shared", name: "shared", config: { enabled: false } };
    expect(
      parsePluginManifest(JSON.stringify({ server: [entry], client: [entry] })),
    ).toEqual({ server: [entry], client: [entry] });
  });
});
