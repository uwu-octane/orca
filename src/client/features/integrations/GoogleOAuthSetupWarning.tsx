// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { AlertTriangle } from "lucide-react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";

export function GoogleOAuthSetupWarning({
  integrationName,
  docsUrl,
}: {
  integrationName: string;
  docsUrl: string;
}) {
  const { t } = useLocale();

  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertTitle>{t("Google OAuth client not configured")}</AlertTitle>
      <AlertDescription>
        <p>
          {t(
            "Add your Google client ID and secret to this Orca deployment before connecting {name}.",
            { name: integrationName },
          )}
        </p>
        <SafeExternalLink
          url={docsUrl}
          label={t("Open setup guide")}
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
        />
      </AlertDescription>
    </Alert>
  );
}
