import type { GoogleAdsCredentials } from "@/plugins/google-oauth/contracts";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import {
  googleLanguageSchema,
  googleLocationSchema,
  googleLocationSearchInputSchema,
  googleTargetingOptionsInputSchema,
} from "@/types/schemas/google-keyword-targeting";

import type { createGoogleAdsClient } from "./client";

type Context = { projectId: string; organizationId: string };
const locationFields =
  "geo_target_constant.id, geo_target_constant.name, geo_target_constant.canonical_name, geo_target_constant.country_code, geo_target_constant.target_type, geo_target_constant.status";

function headers(config: GoogleAdsCredentials) {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    "login-customer-id": config.loginCustomerId,
  };
}

export function createTargeting(
  credentials: (scope: Context) => Promise<GoogleAdsCredentials>,
  googleAdsRequest: ReturnType<typeof createGoogleAdsClient>["request"],
) {
  async function searchRows<T>(
    config: GoogleAdsCredentials,
    query: string,
    row: z.ZodType<T>,
  ) {
    const schema = z.object({
      results: z.array(row).optional(),
      nextPageToken: z.string().optional(),
    });
    const rows: T[] = [];
    const visited = new Set<string>();
    let pageToken: string | undefined;
    do {
      const page = schema.safeParse(
        await googleAdsRequest(
          `https://googleads.googleapis.com/v25/customers/${config.customerId}/googleAds:search`,
          {
            method: "POST",
            headers: headers(config),
            body: JSON.stringify({ query, pageToken }),
          },
        ),
      );
      if (!page.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
      rows.push(...(page.data.results ?? []));
      pageToken = page.data.nextPageToken;
      if (pageToken) {
        if (visited.has(pageToken))
          throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
        visited.add(pageToken);
      }
    } while (pageToken);
    return rows;
  }

  async function options(
    input: z.infer<typeof googleTargetingOptionsInputSchema>,
    context: Context,
  ) {
    const { locationIds } = googleTargetingOptionsInputSchema.parse({
      ...input,
      projectId: context.projectId,
    });
    const config = await credentials(context);
    const locationRow = z.object({ geoTargetConstant: googleLocationSchema });
    const [countries, languages, savedLocations] = await Promise.all([
      searchRows(
        config,
        `SELECT ${locationFields} FROM geo_target_constant WHERE geo_target_constant.target_type = 'Country' AND geo_target_constant.status = 'ENABLED' ORDER BY geo_target_constant.name`,
        locationRow,
      ),
      searchRows(
        config,
        "SELECT language_constant.id, language_constant.name, language_constant.code, language_constant.targetable FROM language_constant ORDER BY language_constant.name",
        z.object({ languageConstant: googleLanguageSchema }),
      ),
      // Resolve old city/region IDs as well as countries, without rewriting history.
      locationIds.length
        ? searchRows(
            config,
            `SELECT ${locationFields} FROM geo_target_constant WHERE geo_target_constant.id IN (${locationIds.join(",")})`,
            locationRow,
          )
        : [],
    ]);
    return {
      locations: [
        ...new Map(
          [...countries, ...savedLocations].map(({ geoTargetConstant }) => [
            geoTargetConstant.id,
            geoTargetConstant,
          ]),
        ).values(),
      ],
      languages: languages.map(({ languageConstant }) => languageConstant),
    };
  }

  async function searchLocations(
    input: z.infer<typeof googleLocationSearchInputSchema>,
    context: Context,
  ) {
    const { query, locale } = googleLocationSearchInputSchema.parse({
      ...input,
      projectId: context.projectId,
    });
    const config = await credentials(context);
    const response = z
      .object({
        geoTargetConstantSuggestions: z
          .array(z.object({ geoTargetConstant: googleLocationSchema }))
          .optional(),
      })
      .safeParse(
        await googleAdsRequest(
          "https://googleads.googleapis.com/v25/geoTargetConstants:suggest",
          {
            method: "POST",
            headers: headers(config),
            body: JSON.stringify({ locale, locationNames: { names: [query] } }),
          },
        ),
      );
    if (!response.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
    const locations = (response.data.geoTargetConstantSuggestions ?? [])
      .map(({ geoTargetConstant }) => geoTargetConstant)
      .filter((location) => location.status === "ENABLED");
    return [
      ...new Map(locations.map((location) => [location.id, location])).values(),
    ];
  }

  return { options, searchLocations };
}
