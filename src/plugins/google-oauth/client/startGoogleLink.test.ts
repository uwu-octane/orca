vi.mock("@/serverFunctions/googleAds", () => ({
  startGoogleAdsLink: vi.fn(),
  getGoogleAdsConnection: vi.fn(),
  listGoogleAdsAccounts: vi.fn(),
  setGoogleAdsAccount: vi.fn(),
  disconnectGoogleAds: vi.fn(),
}));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { startLink } = vi.hoisted(() => ({ startLink: vi.fn() }));
vi.mock("@/serverFunctions/gsc", () => ({
  startGscLink: startLink,
  getGscConnection: vi.fn(),
  listGscSites: vi.fn(),
  setGscSite: vi.fn(),
  disconnectGsc: vi.fn(),
}));
vi.mock("@/serverFunctions/ga4", () => ({
  startGa4Link: startLink,
  getGa4Connection: vi.fn(),
  listGa4Properties: vi.fn(),
  setGa4Property: vi.fn(),
  disconnectGa4: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { Context } from "cordis";
import * as locale from "@/plugins/locale";
import * as connections from "./index";
vi.mock("@/serverFunctions/projects", () => ({ getProjects: vi.fn() }));
vi.mock("@/serverFunctions/googleAccounts", () => ({
  getGoogleAccountRemovalImpact: vi.fn(),
  removeGoogleAccount: vi.fn(),
}));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));
let ctx: Context;

beforeEach(async () => {
  ctx = new Context();
  await ctx.plugin(locale);
  await ctx.plugin(connections);
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    location: {
      origin: "https://app.example.com",
      href: "https://app.example.com/p/1",
    },
  });
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Google authorization loading", () => {
  it("stays pending during a slow request and after the redirect URL is assigned", async () => {
    let finish!: (value: { url: string }) => void;
    startLink.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const request = ctx.googleConnections.link.start("gsc", "/p/1");
    expect(ctx.googleConnections.link.pending).toBe(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ctx.googleConnections.link.pending).toBe(true);
    expect(await ctx.googleConnections.link.start("ga4", "/p/1")).toBe(false);
    expect(startLink).toHaveBeenCalledTimes(1);
    finish({ url: "https://accounts.google.com/authorize" });
    expect(await request).toBe(true);
    expect(window.location.href).toBe("https://accounts.google.com/authorize");
    expect(ctx.googleConnections.link.pending).toBe(true);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(ctx.googleConnections.link.pending).toBe(true);
    // Preserve recovery when the user cancels a browser navigation.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ctx.googleConnections.link.pending).toBe(false);
  });

  it("clears loading after a failed request and allows retry", async () => {
    startLink.mockRejectedValueOnce(new Error("Network unavailable"));
    expect(await ctx.googleConnections.link.start("gsc", "/p/1")).toBe(false);
    expect(ctx.googleConnections.link.pending).toBe(false);
    startLink.mockResolvedValueOnce({
      url: "https://accounts.google.com/authorize",
    });
    expect(await ctx.googleConnections.link.start("gsc", "/p/1")).toBe(true);
    expect(ctx.googleConnections.link.pending).toBe(true);
  });
});

it("does not navigate when consent completes after plugin disposal", async () => {
  let finish!: (value: { url: string }) => void;
  startLink.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const request = ctx.googleConnections.link.start("gsc", "/p/1");
  await ctx.fiber.dispose();
  finish({ url: "https://accounts.google.com/authorize" });
  expect(await request).toBe(false);
  expect(window.location.href).toBe("https://app.example.com/p/1");
  expect(vi.getTimerCount()).toBe(0);
});

it("releases the pending-navigation timer when the plugin unloads", async () => {
  startLink.mockResolvedValueOnce({
    url: "https://accounts.google.com/authorize",
  });
  await ctx.googleConnections.link.start("gsc", "/p/1");
  await ctx.fiber.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
