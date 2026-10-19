import { useLocale } from "@/plugins/client/context";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { SCHEDULED_RANK_CHECKS_PAUSED } from "@/shared/rank-tracking-pause";

export function ScheduledChecksPausedAlert() {
  const { t } = useLocale();

  if (!SCHEDULED_RANK_CHECKS_PAUSED || !isHostedClientAuthMode()) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle />
      <AlertDescription className="text-foreground">
        <p>
          <span className="font-medium">
            {t("Scheduled rank tracking has been temporarily disabled.")}
          </span>{" "}
          {t(
            "Scraping Google Search Results has been unreliable industry wide due to change Google has made. Due to this, we've disabled it until we have a better solution. We should have an update within the next week. Sorry for the inconvenience.",
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
}
