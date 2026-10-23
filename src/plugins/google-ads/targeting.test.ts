import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Context } from "cordis";
import GoogleOAuthService from "@/plugins/google-oauth/server";
import * as googleAds from "./index";
let ctx: Context;
let service: Context["googleAds"];

const mocks = vi.hoisted(() => ({
  credentials: vi.fn(),
  fetch: vi.fn<typeof fetch>(),
}));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));
const context = { projectId: "project1", organizationId: "org1" };
const english = { id: "1000", name: "English", code: "en", targetable: true };
function location(overrides = {}) {
  return {
    id: "2840",
    name: "United States",
    canonicalName: "United States",
    countryCode: "US",
    targetType: "Country",
    status: "ENABLED",
    ...overrides,
  };
}
const city = location({
  id: "1014221",
  name: "San Francisco",
  canonicalName: "San Francisco,California,United States",
  targetType: "City",
});
beforeEach(async () => {
  ctx = new Context();
  await ctx.plugin(GoogleOAuthService);
  vi.spyOn(ctx.googleOAuth.ads, "credentials").mockImplementation(
    mocks.credentials,
  );
  await ctx.plugin(googleAds);
  service = ctx.googleAds;
  mocks.credentials.mockResolvedValue({
    accessToken: "test-token",
    customerId: "1111111111",
    loginCustomerId: "1111111111",
  });
  mocks.fetch.mockResolvedValue(Response.json({}));
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(async () => {
  await ctx.fiber.dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("maps country, saved city and paginated language IDs without dropping history locations", async () => {
  mocks.fetch.mockImplementation(async (_url, init) => {
    const body = typeof init?.body === "string" ? init.body : "";
    if (body.includes("FROM language_constant"))
      return Response.json(
        body.includes('"pageToken":"more-languages"')
          ? {
              results: [
                {
                  languageConstant: {
                    ...english,
                    id: "1001",
                    name: "German",
                    code: "de",
                  },
                },
              ],
            }
          : {
              results: [{ languageConstant: english }],
              nextPageToken: "more-languages",
            },
      );
    return Response.json({
      results: (body.includes(" IN (") ? [city, location()] : [location()]).map(
        (geoTargetConstant) => ({ geoTargetConstant }),
      ),
    });
  });
  const result = await service.options(
    { projectId: context.projectId, locationIds: ["1014221", "2840"] },
    context,
  );
  expect(
    result.locations.map(({ id, canonicalName }) => ({ id, canonicalName })),
  ).toEqual([
    { id: "2840", canonicalName: "United States" },
    { id: "1014221", canonicalName: "San Francisco,California,United States" },
  ]);
  expect(result.languages.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: "1000", name: "English" },
    { id: "1001", name: "German" },
  ]);
});

it("keeps ambiguous city names distinct and excludes inactive search suggestions", async () => {
  const otherCity = location({
    id: "999999",
    name: city.name,
    canonicalName: "San Francisco,Cordoba,Argentina",
    countryCode: "AR",
    targetType: "City",
  });
  mocks.fetch.mockResolvedValue(
    Response.json({
      geoTargetConstantSuggestions: [
        city,
        city,
        otherCity,
        location({ status: "REMOVAL_PLANNED" }),
      ].map((geoTargetConstant) => ({ geoTargetConstant })),
    }),
  );
  const results = await service.searchLocations(
    { projectId: context.projectId, query: "San Francisco", locale: "en" },
    context,
  );
  expect(
    results.map(({ id, canonicalName }) => ({ id, canonicalName })),
  ).toEqual([
    { id: city.id, canonicalName: city.canonicalName },
    { id: otherCity.id, canonicalName: otherCity.canonicalName },
  ]);
});

it("fails explicitly when a catalog request fails instead of returning partial options", async () => {
  mocks.fetch.mockImplementation(async (_url, init) =>
    typeof init?.body === "string" && init.body.includes("language_constant")
      ? Response.json({}, { status: 403 })
      : Response.json({ results: [{ geoTargetConstant: location() }] }),
  );
  await expect(
    service.options({ projectId: context.projectId, locationIds: [] }, context),
  ).rejects.toMatchObject({ code: "GOOGLE_ADS_REQUEST_FAILED" });
});
