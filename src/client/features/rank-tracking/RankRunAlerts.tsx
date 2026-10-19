// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { useRankRunPolling } from "./useRankRunPolling";

/** Warnings about the latest rank check: stale, failed, or incomplete. */
export function RankRunAlerts({
  run,
}: {
  run: ReturnType<typeof useRankRunPolling>;
}) {
  const { t } = useLocale();

  if (!run) return null;

  if (run.maybeStale) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          {t(
            "This run may be unresponsive and will be cleaned up automatically.",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (run.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">{t("Last check failed.")}</span>{" "}
            {run.errorMessage &&
              getStandardErrorMessage(
                new Error(run.errorMessage),
                undefined,
                t,
              )}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // A completed run only has an error message when some checks failed.
  if (run.status === "completed" && run.errorMessage) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertDescription className="text-foreground">
          <p>
            <span className="font-medium">
              {t("Your last check was incomplete.")}
            </span>{" "}
            {t(
              "Our search data provider had errors, so some keywords will show their previous position.",
            )}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
