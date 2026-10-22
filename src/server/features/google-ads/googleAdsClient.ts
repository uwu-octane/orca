import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { getGoogleAccessToken } from "@/server/features/google/googleOAuth";
import { GOOGLE_ADS_OAUTH_PROVIDER_ID } from "@/shared/google-ads";

export async function googleAdsAccessToken(userId: string, accountId: string) {
  try {
    return await getGoogleAccessToken({
      userId,
      accountId,
      providerId: GOOGLE_ADS_OAUTH_PROVIDER_ID,
    });
  } catch {
    throw new AppError("GOOGLE_ADS_RECONNECT_REQUIRED");
  }
}
export async function googleAdsRequest(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  try {
    const response = await fetch(url, {
      ...init,
      // Workers supports only manual/follow. Reject 3xx via response.ok below
      // so OAuth credentials are never forwarded to a redirect destination.
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.warn("google_ads.request_failed", { status: response.status });
      throw new AppError(
        response.status === 401
          ? "GOOGLE_ADS_RECONNECT_REQUIRED"
          : response.status === 429
            ? "RATE_LIMITED"
            : "GOOGLE_ADS_REQUEST_FAILED",
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
  }
}
const customerSchema = z.object({
  id: z.string().regex(/^\d{10}$/),
  descriptiveName: z.string().optional(),
  manager: z.boolean().optional(),
  status: z.string(),
});
const pageSchema = z.object({
  results: z.array(z.object({ customerClient: customerSchema })).optional(),
  nextPageToken: z.string().optional(),
});

export async function discoverGoogleAdsCustomers(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const roots = z
    .object({
      resourceNames: z
        .array(z.string().regex(/^customers\/\d{10}$/))
        .optional(),
    })
    .safeParse(
      await googleAdsRequest(
        "https://googleads.googleapis.com/v25/customers:listAccessibleCustomers",
        { headers },
      ),
    );
  if (!roots.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
  const customers: Array<{
    id: string;
    customerId: string;
    loginCustomerId: string;
    name: string;
  }> = [];
  for (const root of roots.data.resourceNames ?? []) {
    const loginCustomerId = root.slice("customers/".length);
    let pageToken: string | undefined;
    const visited = new Set<string>();
    do {
      const page = pageSchema.safeParse(
        await googleAdsRequest(
          `https://googleads.googleapis.com/v25/${root}/googleAds:search`,
          {
            method: "POST",
            headers: { ...headers, "login-customer-id": loginCustomerId },
            body: JSON.stringify({
              query:
                "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.status FROM customer_client WHERE customer_client.manager = FALSE AND customer_client.status = 'ENABLED'",
              pageToken,
            }),
          },
        ),
      );
      if (!page.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
      for (const { customerClient: customer } of page.data.results ?? []) {
        if (customer.manager || customer.status !== "ENABLED") continue;
        customers.push({
          id: `${loginCustomerId}:${customer.id}`,
          customerId: customer.id,
          loginCustomerId,
          name: customer.descriptiveName || customer.id,
        });
      }
      pageToken = page.data.nextPageToken;
      if (pageToken) {
        if (visited.has(pageToken))
          throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
        visited.add(pageToken);
      }
    } while (pageToken);
  }
  return customers;
}

export async function googleAdsAccountEmail(accessToken: string) {
  const result = z.object({ email: z.email() }).safeParse(
    await googleAdsRequest("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  if (!result.success) throw new AppError("GOOGLE_ADS_REQUEST_FAILED");
  return result.data.email;
}
