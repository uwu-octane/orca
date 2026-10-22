import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GoogleAdsConnectionService as service } from "./GoogleAdsConnectionService";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  listGrants: vi.fn(),
  save: vi.fn(),
  disconnect: vi.fn(),
  token: vi.fn(),
  fetch: vi.fn<typeof fetch>(),
}));
vi.mock("./GoogleAdsConnectionRepository", () => ({
  GoogleAdsConnectionRepository: mocks,
}));
vi.mock("@/server/features/google/googleOAuth", () => ({
  getGoogleAccessToken: mocks.token,
}));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => false,
}));
const input = {
  projectId: "p1",
  organizationId: "org1",
  userId: "user1",
  accountId: "google1",
  propertyId: "1111111111:2222222222",
};
function customer(id: string, manager = false) {
  return {
    customerClient: {
      id,
      manager,
      status: "ENABLED",
      descriptiveName: `Ads ${id}`,
    },
  };
}
function urlString(url: RequestInfo | URL) {
  return typeof url === "string"
    ? url
    : url instanceof URL
      ? url.href
      : url.url;
}
beforeEach(() => {
  mocks.get.mockResolvedValue(null);
  mocks.listGrants.mockResolvedValue([{ accountId: "google1" }]);
  mocks.save.mockImplementation(async (value: unknown) => value);
  mocks.disconnect.mockResolvedValue(undefined);
  mocks.token.mockResolvedValue("test-token");
  mocks.fetch.mockImplementation(async (url) => {
    if (urlString(url).endsWith("userinfo"))
      return Response.json({ email: "owner@example.com" });
    if (urlString(url).endsWith(":listAccessibleCustomers"))
      return Response.json({ resourceNames: ["customers/1111111111"] });
    return Response.json({ results: [customer("2222222222")] });
  });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

it("discovers manager clients across pages, preserving the explicit access route", async () => {
  mocks.fetch.mockImplementation(async (url, options) => {
    if (urlString(url).endsWith("userinfo"))
      return Response.json({ email: "owner@example.com" });
    if (urlString(url).endsWith(":listAccessibleCustomers"))
      return Response.json({ resourceNames: ["customers/1111111111"] });
    const body = typeof options?.body === "string" ? options.body : "";
    expect(options?.headers).toMatchObject({
      "login-customer-id": "1111111111",
    });
    return body.includes('"pageToken":"page2"')
      ? Response.json({ results: [customer("3333333333")] })
      : Response.json({
          results: [customer("2222222222"), customer("1111111111", true)],
          nextPageToken: "page2",
        });
  });
  const result = await service.listAccounts(input);
  expect(result.accounts[0]).toMatchObject({
    email: "owner@example.com",
    unavailable: false,
    requiresReconnect: false,
  });
  expect(result.accounts[0].properties.map((item) => item.id)).toEqual([
    "1111111111:2222222222",
    "1111111111:3333333333",
  ]);
});

it("saves only a freshly discovered customer under the selected grant", async () => {
  const result = await service.save(input);
  expect(result).toMatchObject({
    projectId: "p1",
    organizationId: "org1",
    customerId: "2222222222",
    loginCustomerId: "1111111111",
    googleAccountId: "google1",
    connectedByUserId: "user1",
    connectedAccountEmail: "owner@example.com",
  });
});

it("rejects another user's grant before any Google request or persistence", async () => {
  mocks.listGrants.mockResolvedValue([{ accountId: "someone-else" }]);
  await expect(service.save(input)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("rejects a forged manager route even when the customer ID matches", async () => {
  await expect(
    service.save({ ...input, propertyId: "9999999999:2222222222" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(mocks.save).not.toHaveBeenCalled();
});

it.each([401, 403, 429])(
  "shows failed account discovery as an error state, not an empty account (%s)",
  async (status) => {
    mocks.fetch.mockResolvedValue(Response.json({}, { status }));
    const { accounts } = await service.listAccounts(input);
    expect(accounts[0]).toMatchObject({
      requiresReconnect: status === 401,
      unavailable: status !== 401,
      properties: [],
    });
  },
);
