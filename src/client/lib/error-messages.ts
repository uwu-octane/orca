import { FREE_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { isErrorCode, type ErrorCode } from "@/shared/error-codes";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

/**
 * Copy for an error we did not expect. Hosted users cannot read our logs, so
 * they get support; a self-hoster runs the server and can.
 */
export const UNEXPECTED_ERROR_MESSAGE = isHostedClientAuthMode()
  ? "Something went wrong on our end. Please try again, and contact support if it keeps happening."
  : "Something went wrong. Please try again, or check the server logs for details.";

const STANDARD_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Please sign in and try again.",
  AUTH_CONFIG_MISSING:
    "Orca auth is not configured. Follow the README setup steps for Cloudflare Access.",
  PAYMENT_REQUIRED:
    "An active hosted subscription is required before you can use Orca.",
  INSUFFICIENT_CREDITS:
    "You don't have enough credits for this. Upgrade your plan or buy more credits to keep going.",
  AUDIT_RENDERING_UNAVAILABLE:
    "JavaScript rendering is not configured on this deployment. Ask your administrator to enable a renderer.",
  FORBIDDEN: "You do not have access to this resource.",
  NOT_FOUND: "The requested resource was not found.",
  AUDIT_CAPACITY_REACHED:
    "You've reached audit capacity for your account. Delete old audits from your projects to start a new one.",
  AUDIT_PAGE_LIMIT_EXCEEDED:
    "Free plan audits are limited to {max} pages. Upgrade to run larger audits.",
  AUDIT_ALREADY_RUNNING:
    "You've reached the limit of audits running at once. Wait for one to finish or delete it before starting another.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNKNOWN_LOCATION:
    "We couldn't find that city, county, or region. Pick a location from the list, or clear the field to search the whole country.",
  CRAWL_TARGET_BLOCKED: "This crawl target is blocked by security policy.",
  BACKLINKS_BILLING_ISSUE:
    "The connected DataForSEO account has a billing or balance issue.",
  AI_SEARCH_BILLING_ISSUE:
    "The connected DataForSEO account has a billing or balance issue.",
  AI_VISIBILITY_ERROR:
    "The AI visibility request could not be completed. Review the tracking settings and try again.",
  DATAFORSEO_AUTH_FAILED:
    "DataForSEO rejected the API key. Check that DATAFORSEO_API_KEY is the base64 of your DataForSEO login:password.",
  GOOGLE_ADS_NOT_CONFIGURED:
    "Connect a Google Ads account to start researching keywords.",
  GOOGLE_ADS_RECONNECT_REQUIRED:
    "Reconnect your Google Ads account to continue.",
  GOOGLE_ADS_REQUEST_FAILED:
    "Google Ads could not complete the request. Check account access and API configuration.",
  RATE_LIMITED: "Too many requests. Please wait and try again.",
  UPSTREAM_UNAVAILABLE:
    "The data provider is temporarily unavailable. Please retry in a moment.",
  CONFLICT: "This request conflicts with existing data.",
  INTERNAL_ERROR: UNEXPECTED_ERROR_MESSAGE,
};

// Setup errors cross the wire as "CODE: detail" (see toClientError) so the
// user sees the server's specific guidance while code-driven UI (error cards,
// redirects) still keys off the code.
function splitCodedMessage(
  message: string,
): { code: ErrorCode; detail: string } | null {
  const separatorIndex = message.indexOf(": ");
  if (separatorIndex === -1) return null;
  const code = message.slice(0, separatorIndex);
  if (!isErrorCode(code)) return null;
  return { code, detail: message.slice(separatorIndex + 2) };
}

type Translator = (key: string) => string;

/** Standard messages carry a `{max}` placeholder for the audit page limit. */
function render(message: string, t?: Translator): string {
  const text = t ? t(message) : message;
  return text.replaceAll("{max}", String(FREE_MAX_AUDIT_PAGES));
}

export function getStandardErrorMessage(
  error: unknown,
  fallback: string = STANDARD_MESSAGES.INTERNAL_ERROR,
  t?: Translator,
): string {
  if (!(error instanceof Error)) return render(fallback, t);
  if (isErrorCode(error.message)) {
    return render(STANDARD_MESSAGES[error.message], t);
  }
  const coded = splitCodedMessage(error.message);
  // FORK: locale plugin — the detail is a dictionary key (English source), so
  // it translates like any other message; unknown details pass through.
  if (coded) return render(coded.detail, t);
  if (error.message) return error.message;
  return render(fallback, t);
}

export function getErrorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof Error)) return null;
  if (isErrorCode(error.message)) return error.message;
  return splitCodedMessage(error.message)?.code ?? null;
}
