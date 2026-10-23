// FORK: Google authorization and project bindings belong to google-oauth.
import { getGoogleOAuth } from "@/plugins/server/context";
import {
  createGscClient,
  type UrlInspectionResult,
  type GscSearchAnalyticsRequest,
  type GscSearchAnalyticsRow,
} from "@/server/lib/gscClient";
import { GscNotConnectedError, GscTokenError } from "@/server/lib/gscErrors";
export { GscNotConnectedError } from "@/server/lib/gscErrors";
import {
  buildSearchAnalyticsRequest,
  type GscPerformanceInput,
} from "@/server/features/gsc/searchAnalytics";
type GscPerformanceResult = {
  siteUrl: string;
  connectedBy: string | null;
  request: GscSearchAnalyticsRequest;
  rows: GscSearchAnalyticsRow[];
};

/** Pass-through of GSC `searchAnalytics.query` for a project's connected property. */
async function getPerformance(
  input: GscPerformanceInput,
): Promise<GscPerformanceResult> {
  const connection = await (
    await getGoogleOAuth()
  ).gsc.getConnection(input.projectId);
  if (!connection) {
    throw new GscNotConnectedError(input.projectId);
  }
  const request = buildSearchAnalyticsRequest(input);
  // The MCP input schema caps tool responses at 1,000; app consumers may
  // request Google's full page to compare low-click keywords accurately.
  if (input.rowLimit !== undefined)
    request.rowLimit = Math.max(1, Math.min(25000, input.rowLimit));

  const client = createGscClient({
    userId: connection.connectedByUserId,
    gscAccountId: connection.gscAccountId ?? undefined,
  });
  const rows = await client.querySearchAnalytics(connection.siteUrl, request);
  return {
    siteUrl: connection.siteUrl,
    connectedBy: connection.connectedAccountEmail,
    request,
    rows,
  };
}

type GscUrlInspection = {
  url: string;
  result: UrlInspectionResult | null;
  error?: string;
};

type GscInspectUrlsResult = {
  siteUrl: string;
  connectedBy: string | null;
  results: GscUrlInspection[];
};

/** Inspect 1–N URLs against a project's connected property. Resolves the
 *  connection once, then inspects each URL; per-URL failures are captured
 *  inline so one bad URL doesn't fail the batch. Token/grant failures
 *  propagate so the caller can prompt a reconnect. */
async function inspectUrls(input: {
  projectId: string;
  urls: string[];
  languageCode?: string;
}): Promise<GscInspectUrlsResult> {
  const connection = await (
    await getGoogleOAuth()
  ).gsc.getConnection(input.projectId);
  if (!connection) {
    throw new GscNotConnectedError(input.projectId);
  }
  const client = createGscClient({
    userId: connection.connectedByUserId,
    gscAccountId: connection.gscAccountId ?? undefined,
  });
  const results: GscUrlInspection[] = [];
  for (const url of input.urls) {
    try {
      const result = await client.inspectUrl(
        connection.siteUrl,
        url,
        input.languageCode,
      );
      results.push({ url, result });
    } catch (error) {
      if (error instanceof GscTokenError) throw error;
      results.push({
        url,
        result: null,
        error: error instanceof Error ? error.message : "Inspection failed",
      });
    }
  }
  return {
    siteUrl: connection.siteUrl,
    connectedBy: connection.connectedAccountEmail,
    results,
  };
}

export const GscService = { getPerformance, inspectUrls };
