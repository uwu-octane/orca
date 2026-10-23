import { describe, expect, it } from "vitest";
import {
  sanitizePostHogProperties,
  sanitizePostHogNetworkRequest,
  sanitizePostHogUrl,
} from "@/client/lib/posthog-sanitize";

const consentUrl =
  "https://app.example.test/oauth-consent?state=state-secret&future_parameter=future-secret";

describe("sanitizePostHogUrl", () => {
  it("removes the complete query from OAuth consent URLs, including on event and session properties", () => {
    expect(sanitizePostHogUrl(consentUrl)).toBe(
      "https://app.example.test/oauth-consent",
    );
    expect(
      sanitizePostHogProperties({
        $current_url: consentUrl,
        $session_entry_url: consentUrl,
        $referrer: consentUrl,
        event_detail: "kept",
      }),
    ).toEqual({
      $current_url: "https://app.example.test/oauth-consent",
      $session_entry_url: "https://app.example.test/oauth-consent",
      $referrer: "https://app.example.test/oauth-consent",
      event_detail: "kept",
    });
  });

  it("preserves ordinary query data while removing email", () => {
    expect(
      sanitizePostHogUrl(
        "https://app.example.test/onboarding?step=2&email=user%40example.test",
      ),
    ).toBe("https://app.example.test/onboarding?step=2");
  });
});

it("never records API secrets in replay request/response bodies or headers", () => {
  const safe = sanitizePostHogNetworkRequest({
    name: "https://app.example.test/_server/saveKey",
    entryType: "resource",
    startTime: 0,
    duration: 12,
    requestBody: JSON.stringify({
      credential: { action: "replace", value: "request-key-secret" },
    }),
    responseBody: "response-key-secret",
    requestHeaders: { authorization: "Bearer header-key-secret" },
    responseHeaders: { "set-cookie": "cookie-secret" },
  });
  expect(JSON.stringify(safe)).not.toContain("secret");
  expect(safe).toMatchObject({
    name: "https://app.example.test/_server/saveKey",
    duration: 12,
  });
});
