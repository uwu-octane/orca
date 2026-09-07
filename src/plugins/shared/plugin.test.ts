import { describe, expect, it, vi } from "vitest";
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
  it("rejects missing required services after settling", async () => {
    const ctx = new Context();
    const apply = vi.fn();
    await expect(
      bootPlugins(ctx, [{ id: "consumer", name: "consumer" }], {
        consumer: async () => ({
          name: "consumer",
          inject: ["missing"],
          apply,
        }),
      }),
    ).rejects.toThrow(/consumer.*did not activate.*missing/);
    expect(apply).not.toHaveBeenCalled();
  });

  it("activates a consumer whose dependency is mounted later", async () => {
    const ctx = new Context();
    const apply = vi.fn();
    try {
      await bootPlugins(
        ctx,
        [
          { id: "consumer", name: "consumer" },
          { id: "provider", name: "plain-plugin" },
        ],
        {
          ...modules,
          consumer: async () => ({ inject: ["plainValue"], apply }),
        },
      );
      expect(apply).toHaveBeenCalledOnce();
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("does not require dependencies of disabled plugins", async () => {
    const ctx = new Context();
    const load = vi.fn();
    try {
      await bootPlugins(
        ctx,
        [{ id: "consumer", name: "consumer", disabled: true }],
        { consumer: load },
      );
      expect(load).not.toHaveBeenCalled();
    } finally {
      await ctx.fiber.dispose();
    }
  });

  it("rejects duplicate IDs before importing any modules", async () => {
    const ctx = new Context();
    const load = vi.fn();
    await expect(
      bootPlugins(
        ctx,
        [
          { id: "same", name: "one" },
          { id: "same", name: "two" },
        ],
        { one: load, two: load },
      ),
    ).rejects.toThrow(/Duplicate plugin entry id: same/);
    expect(load).not.toHaveBeenCalled();
  });

  it("awaits cleanup of earlier registrations when a later module fails", async () => {
    const ctx = new Context();
    const cleanup = vi.fn(async () => {
      await Promise.resolve();
    });
    await expect(
      bootPlugins(
        ctx,
        [
          { id: "resource", name: "resource" },
          { id: "missing", name: "missing" },
        ],
        {
          resource: async () => ({
            apply(pluginContext: Context) {
              pluginContext.provide("resource", true);
              pluginContext.effect(() => cleanup);
            },
          }),
        },
      ),
    ).rejects.toThrow(/unknown plugin module/);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(ctx.get("resource")).toBeUndefined();
  });

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
