import { afterAll, expect, it, vi } from "vitest";
import { getAuditContext } from "./context";

vi.mock("cloudflare:workers", () => ({ env: {} }));
// Audit boot must not construct the web auth instance or require its secrets.
vi.mock("@/lib/auth", () => {
  throw new Error("Web authorization must not load in the audit Worker");
});

afterAll(async () => {
  await (await getAuditContext()).fiber.dispose();
});

it("boots the audit capabilities without application authorization or supplier I/O", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const boot = getAuditContext();
  expect(getAuditContext()).toBe(boot);
  const ctx = await boot;
  expect(ctx.seoData.serpCacheIdentity()).toMatchObject({
    provider: "dataforseo",
  });
  expect(ctx.get("dataforseo")).toBeDefined();
  expect(ctx.get("googleOAuth")).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});
