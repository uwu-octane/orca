import { Context } from "cordis";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as locale from "@/plugins/locale";
import * as sam from ".";

vi.mock("@/serverFunctions/sam", () => ({
  listSamSessions: vi.fn(),
  createSamSession: vi.fn(),
  archiveSamSession: vi.fn(),
}));
vi.mock("@/serverFunctions/samAccess", () => ({
  getSamAccessSetupStatus: vi.fn(),
}));
vi.mock("@/serverFunctions/projects", () => ({ getProjects: vi.fn() }));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));
let ctx: Context;
beforeEach(async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  ctx = new Context();
  await ctx.plugin(locale);
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.unstubAllGlobals();
});

it("preserves opt-in across activation while retiring the old preference and subscriptions", async () => {
  const mounted = ctx.plugin(sam);
  await mounted;
  const old = ctx.samUi.beta;
  const changed = vi.fn();
  old.subscribe(changed);
  expect(old.read()).toBe(false);
  old.optIn();
  expect(changed).toHaveBeenCalledTimes(1);
  await mounted.dispose();
  expect(ctx.get("samUi")).toBeUndefined();
  expect(old.read()).toBe(false);
  expect(() => old.optIn()).toThrow(/not active/);
  await ctx.plugin(sam);
  expect(ctx.samUi.beta.read()).toBe(true);
  ctx.samUi.beta.optIn();
  expect(changed).toHaveBeenCalledTimes(1);
});

it("keeps storage-unavailable opt-in only for the current activation", async () => {
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  });
  const mounted = ctx.plugin(sam);
  await mounted;
  ctx.samUi.beta.optIn();
  expect(ctx.samUi.beta.read()).toBe(true);
  await mounted.dispose();
  await ctx.plugin(sam);
  expect(ctx.samUi.beta.read()).toBe(false);
});
