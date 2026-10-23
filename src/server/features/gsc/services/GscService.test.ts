import { beforeEach, describe, expect, it, vi } from "vitest";
import { GscService } from "./GscService";
const mocks = vi.hoisted(() => ({
  getByProjectId: vi.fn(),
  querySearchAnalytics: vi.fn(),
  createGscClient: vi.fn(),
}));
vi.mock("@/plugins/server/context", () => ({
  getGoogleOAuth: async () => ({
    gsc: { getConnection: mocks.getByProjectId },
  }),
}));
vi.mock("@/server/lib/gscClient", () => ({
  createGscClient: mocks.createGscClient,
}));
beforeEach(() => {
  mocks.createGscClient.mockReturnValue({
    querySearchAnalytics: mocks.querySearchAnalytics,
  });
});
describe("GscService.getPerformance", () => {
  beforeEach(() => {
    mocks.querySearchAnalytics.mockResolvedValue([]);
    mocks.getByProjectId.mockResolvedValue({
      connectedByUserId: "u1",
      connectedAccountEmail: null,
      gscAccountId: "sub-a",
      siteUrl: "https://x/",
    });
  });

  it.each([
    ["sub-a", "sub-a"],
    [null, undefined],
  ])(
    "uses the grant stored on the project connection (%s)",
    async (stored, forwarded) => {
      mocks.getByProjectId.mockResolvedValue({
        connectedByUserId: "u1",
        connectedAccountEmail: null,
        gscAccountId: stored,
        siteUrl: "https://x/",
      });

      await GscService.getPerformance({
        projectId: "p1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      });

      expect(mocks.createGscClient).toHaveBeenCalledWith({
        userId: "u1",
        gscAccountId: forwarded,
      });
    },
  );
  it("uses the API's full query page for internal dashboard requests", async () => {
    const result = await GscService.getPerformance({
      projectId: "p1",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      rowLimit: 25000,
    });
    expect(result.request.rowLimit).toBe(25000);
  });
});
