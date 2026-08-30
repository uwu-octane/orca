import { AlertTriangle } from "lucide-react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { useLocale } from "@/plugins/client/context";

export function GoogleOAuthSetupWarning({
  integrationName,
  docsUrl,
}: {
  integrationName: string;
  docsUrl: string;
}) {
  const { t } = useLocale();
  return (
    <div className="alert alert-warning items-start text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{t("Google OAuth client not configured")}</p>
        <p className="text-base-content/70">
          {t(
            "Add your Google client ID and secret to this OpenSEO deployment before connecting {integrationName}.",
            { integrationName },
          )}
        </p>
        <SafeExternalLink
          url={docsUrl}
          label={t("Open setup guide")}
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
        />
      </div>
    </div>
  );
}
