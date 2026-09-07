import { afterEach, describe, expect, it, vi } from "vitest";
import type { Context } from "cordis";

const state = vi.hoisted(() => ({ fail: true, cleanup: vi.fn() }));

vi.mock("@/plugins/manifest.yaml?raw", () => ({
  default:
    "server:\n  - id: resource\n    name: resource\n  - id: checked\n    name: checked",
}));

vi.mock("@/plugins/server/modules", () => ({
  serverModules: {
    resource: async () => ({
      apply(ctx: Context) {
        ctx.provide("resource", true);
        ctx.effect(() => state.cleanup);
      },
    }),
    checked: async () => {
      if (state.fail) throw new Error("test boot failure");
      return { apply() {} };
    },
  },
}));

afterEach(() => vi.resetModules());

describe("getAppContext", () => {
  it("shares concurrent boot, disposes failures, and retries on a fresh context", async () => {
    const { getAppContext } = await import("@/plugins/server/context");
    const first = getAppContext();
    expect(getAppContext()).toBe(first);
    await expect(first).rejects.toThrow(/test boot failure/);
    expect(state.cleanup).toHaveBeenCalledOnce();

    state.fail = false;
    const retry = getAppContext();
    expect(retry).not.toBe(first);
    expect(getAppContext()).toBe(retry);
    const ctx = await retry;
    try {
      expect(ctx.get("resource")).toBe(true);
      expect(state.cleanup).toHaveBeenCalledOnce();
    } finally {
      await ctx.fiber.dispose();
    }
    expect(state.cleanup).toHaveBeenCalledTimes(2);
  });
});
