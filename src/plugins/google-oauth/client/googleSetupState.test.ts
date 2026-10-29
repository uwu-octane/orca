vi.mock("@/serverFunctions/googleAds", () => ({
  startGoogleAdsLink: vi.fn(),
  getGoogleAdsConnection: vi.fn(),
  listGoogleAdsAccounts: vi.fn(),
  setGoogleAdsAccount: vi.fn(),
  disconnectGoogleAds: vi.fn(),
}));
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Context } from "cordis";
import * as locale from "@/plugins/locale";
import * as googleConnections from "./index";
import type { GooglePickerAccount } from "./GooglePropertyPicker";

vi.mock("@/serverFunctions/gsc", () => ({
  startGscLink: vi.fn(),
  getGscConnection: vi.fn(),
  listGscSites: vi.fn(),
  setGscSite: vi.fn(),
  disconnectGsc: vi.fn(),
}));
vi.mock("@/serverFunctions/ga4", () => ({
  startGa4Link: vi.fn(),
  getGa4Connection: vi.fn(),
  listGa4Properties: vi.fn(),
  setGa4Property: vi.fn(),
  disconnectGa4: vi.fn(),
}));
vi.mock("@/serverFunctions/projects", () => ({ getProjects: vi.fn() }));
vi.mock("@/serverFunctions/googleAccounts", () => ({
  getGoogleAccountRemovalImpact: vi.fn(),
  removeGoogleAccount: vi.fn(),
}));
vi.mock("./useGoogleLink", () => ({
  useGoogleLink: () => ({
    startGoogleLink: vi.fn(),
    pending: false,
    available: true,
  }),
}));
vi.mock("@/plugins/google-oauth/client/googleLinkError", () => ({
  getGoogleLinkError: () => null,
  clearGoogleLinkError: vi.fn(),
  reportGoogleLinkErrorOnce: vi.fn(),
}));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));

let ctx: Context;
beforeEach(async () => {
  ctx = new Context();
  await ctx.plugin(locale);
  await ctx.plugin(googleConnections);
});
afterEach(() => ctx.fiber.dispose());

function renderSetup(
  surface: "gsc" | "ga4" | "onboarding",
  hasGrant: boolean,
  connected = false,
  canManage = true,
  {
    connectionError,
    accounts,
  }: {
    connectionError?: "initial" | "refetch";
    accounts?: GooglePickerAccount[];
  } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  client.setQueryData(["projects"], [{ id: "project-a" }]);
  const provider = surface === "ga4" ? "ga4" : "gsc";
  client.setQueryData([`${provider}Connection`, "project-a"], {
    connected,
    currentUserHasGrant: hasGrant,
    canManage,
    googleOAuthConfigured: true,
    property: "https://example.com/",
  });
  if (accounts) {
    client.setQueryData(
      [provider === "gsc" ? "gscSites" : "ga4Properties", "project-a"],
      { accounts },
    );
  }
  if (connectionError) {
    client
      .getQueryCache()
      .find({
        queryKey: [`${provider}Connection`, "project-a"],
      })
      ?.setState({
        status: "error",
        error: new Error("Connection check failed"),
        ...(connectionError === "initial" ? { data: undefined } : {}),
      });
  }
  const component =
    surface === "onboarding"
      ? createElement(ctx.googleConnections.OnboardingStep, {
          onNext: vi.fn(),
          onBack: vi.fn(),
          onSkip: vi.fn(),
        })
      : createElement(ctx.googleConnections.ConnectionCard, {
          provider,
          projectId: "project-a",
        });
  const html = renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, component),
  );
  client.clear();
  return html;
}

describe.each(["gsc", "ga4", "onboarding"] as const)(
  "%s setup from persisted authorization",
  (surface) => {
    it("opens property selection without a browser resume flag after authorization", () => {
      const html = renderSetup(surface, true);
      expect(html).toContain("Choose property");
      expect(html).not.toContain("Connect with Google");
    });
  },
);

it.each(["gsc", "ga4"] as const)(
  "does not automatically open property editing for a %s viewer",
  (surface) => {
    const html = renderSetup(surface, true, false, false);
    expect(html).not.toContain("Choose property");
    expect(html).not.toContain("Save property");
    expect(html).toContain("Manage Google accounts");
  },
);

describe("onboarding connection actions", () => {
  it("keeps cached property setup and a single footer after a failed refetch", () => {
    const html = renderSetup("onboarding", true, false, true, {
      connectionError: "refetch",
    });
    expect(html).toContain("Choose property");
    expect(html).not.toContain("check your Google connection.");
    expect(html.match(/Save and continue/g)).toHaveLength(1);
    expect(html.match(/Skip for now/g)).toHaveLength(1);
    expect(html.match(/ Back<\/button>/g)).toHaveLength(1);
  });

  it("keeps a saved connection usable after a failed refetch", () => {
    const html = renderSetup("onboarding", true, true, true, {
      connectionError: "refetch",
    });
    expect(html).toContain("https://example.com/");
    expect(html).toMatch(/>Continue[ <]/);
    expect(html).not.toContain("Save and continue");
  });

  it("offers retry and disables saving when the initial connection check fails", () => {
    const html = renderSetup("onboarding", false, false, true, {
      connectionError: "initial",
    });
    expect(html).toContain("Couldn&#x27;t check your Google connection.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Choose property");
    expect(html).toMatch(/disabled=""[^>]*>Save and continue/);
  });
});

describe("Search Console website setup guidance", () => {
  const emptyAccount = {
    accountId: "account-a",
    email: "owner@example.com",
    requiresReconnect: false,
    properties: [],
  };

  it.each(["gsc", "onboarding"] as const)(
    "explains empty accounts without opening the %s picker",
    (surface) => {
      const html = renderSetup(surface, true, false, true, {
        accounts: [emptyAccount],
      });
      expect(html).toContain("We couldn’t find your website");
      expect(html).toContain("owner@example.com");
      expect(html).not.toContain("Choose property");
      expect(html).toContain("/blogs/google-search-console-setup");
      expect(html).toContain("Refresh");
      expect(html).toContain("Use a different Google account");
      if (surface === "onboarding") expect(html).toContain("Skip for now");
    },
  );

  it.each([
    { requiresReconnect: true },
    { unavailable: true },
    {
      properties: [
        { id: "https://example.com/", name: "example.com", selectable: true },
      ],
    },
  ])(
    "does not mistake expired, failed, or populated accounts for a new website",
    (patch) => {
      const html = renderSetup("gsc", true, false, true, {
        accounts: [{ ...emptyAccount, ...patch }],
      });
      expect(html).toContain("Choose property");
      expect(html).not.toContain("We couldn’t find your website");
    },
  );
});

it("removes connection surfaces when the client plugin is disposed", async () => {
  await ctx.fiber.dispose();
  expect(ctx.get("googleConnections")).toBeUndefined();
});
