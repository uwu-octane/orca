import { describe, expect, it } from "vitest";
import { Context } from "cordis";
import { z } from "zod";
import { bootPlugins } from "@/plugins/shared/plugin";

const plainPlugin = {
  name: "plain-plugin",
  apply(ctx: Context) {
    ctx.provide("plainValue", 42);
  },
};

const configPlugin = {
  name: "config-plugin",
  Config: z.object({ count: z.number() }),
  apply(ctx: Context, config: { count: number }) {
    ctx.provide("configValue", config.count);
  },
};

const modules = {
  "plain-plugin": () => Promise.resolve({ default: plainPlugin }),
  "config-plugin": () => Promise.resolve({ default: configPlugin }),
};

describe("bootPlugins", () => {
  it("applies manifest entries and exposes their services", async () => {
    const ctx = new Context();
    try {
      await bootPlugins(ctx, [{ id: "p1", name: "plain-plugin" }], modules);
      expect(ctx.get("plainValue")).toBe(42);
    } finally {
      void ctx.fiber.dispose();
    }
  });

  it("does not mount disabled entries", async () => {
    const ctx = new Context();
    try {
      await bootPlugins(
        ctx,
        [{ id: "p1", name: "plain-plugin", disabled: true }],
        modules,
      );
      expect(ctx.get("plainValue")).toBeUndefined();
    } finally {
      void ctx.fiber.dispose();
    }
  });

  it("rejects unknown plugin modules", async () => {
    const ctx = new Context();
    try {
      await expect(
        bootPlugins(ctx, [{ id: "p1", name: "missing-plugin" }], modules),
      ).rejects.toThrow(/unknown plugin module/);
    } finally {
      void ctx.fiber.dispose();
    }
  });

  it("rejects configs that fail the plugin's Zod schema", async () => {
    const ctx = new Context();
    try {
      await expect(
        bootPlugins(
          ctx,
          [{ id: "p1", name: "config-plugin", config: { count: "nope" } }],
          modules,
        ),
      ).rejects.toThrow();
      expect(ctx.get("configValue")).toBeUndefined();
    } finally {
      void ctx.fiber.dispose();
    }
  });

  it("passes valid Zod configs through to apply", async () => {
    const ctx = new Context();
    try {
      await bootPlugins(
        ctx,
        [{ id: "p1", name: "config-plugin", config: { count: 7 } }],
        modules,
      );
      expect(ctx.get("configValue")).toBe(7);
    } finally {
      void ctx.fiber.dispose();
    }
  });
});
