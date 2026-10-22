// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";
import { QueryError } from "@/client/components/QueryState";
import type { GooglePickerAccount } from "./GooglePropertyPicker";

export function GscPropertySetupHelp({
  accounts,
  emptyGsc,
  loading,
  error,
  busy,
  linking,
  onRetry,
  onReconnect,
}: {
  accounts: GooglePickerAccount[];
  emptyGsc: boolean;
  loading: boolean;
  error: boolean;
  busy: boolean;
  linking: boolean;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  const { t } = useLocale();

  if (!emptyGsc && !error) return null;

  return (
    <>
      {emptyGsc ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <h2 className="font-semibold">
            {t("We couldn’t find your website")}
          </h2>
          <p className="break-words text-muted-foreground">
            {t("We checked {accounts}.", {
              accounts: accounts
                .map(
                  (account) =>
                    account.email ??
                    t("Google account · {id}", {
                      id: account.accountId.slice(-6),
                    }),
                )
                .join(", "),
            })}
          </p>
          <p className="text-muted-foreground">
            {accounts.length === 1
              ? t(
                  "Add your site to Search Console, or ask whoever manages it to give this account access.",
                )
              : t(
                  "Add your site to Search Console, or ask whoever manages it to give one of these accounts access.",
                )}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("Open Search Console ↗")}
            </a>
            <a
              href="https://openseo.so/blogs/google-search-console-setup"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t("Setup guide")}
            </a>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        {error ? (
          <QueryError
            fallback={t("Couldn't load Search Console websites.")}
            onRetry={onRetry}
          />
        ) : null}
        {emptyGsc ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={loading || busy}
            >
              {loading ? t("Refreshing…") : t("Refresh")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReconnect}
              disabled={loading || busy}
              pending={linking}
            >
              {linking
                ? t("Opening Google…")
                : t("Use a different Google account")}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function EmptyAccountMessage({
  provider,
  filtered,
}: {
  provider: "gsc" | "ga4" | "google_ads";
  filtered: boolean;
}) {
  const { t } = useLocale();

  return (
    <>
      {filtered ? (
        t("No matching properties in this account")
      ) : provider === "gsc" ? (
        <>
          {t("No websites found for this account.")}{" "}
          <a
            href="https://openseo.so/blogs/google-search-console-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {t("Add a website or get access")}
          </a>
          {t(", then refresh the list.")}
        </>
      ) : (
        t(
          provider === "google_ads"
            ? "No advertising accounts available"
            : "No properties available",
        )
      )}
    </>
  );
}

export function hasNoGscWebsites(
  accounts: GooglePickerAccount[],
  loading: boolean,
  error: boolean,
) {
  return (
    !loading &&
    !error &&
    accounts.length > 0 &&
    accounts.every(
      (account) =>
        !account.requiresReconnect &&
        !account.unavailable &&
        account.properties.length === 0,
    )
  );
}
