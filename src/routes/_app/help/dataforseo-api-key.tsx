// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  const { t } = useLocale();

  return (
    <SecretHelpPage
      title={t("Set up your DataForSEO API key")}
      intro={
        <>
          {t("Orca needs the")} <code>DATAFORSEO_API_KEY</code>{" "}
          {t("secret before keyword, domain, and SEO data workflows can run.")}
        </>
      }
      secretName="DATAFORSEO_API_KEY"
      steps={
        <>
          <li>
            {t("Go to")}{" "}
            <a
              className={helpLinkClassName}
              href={DATAFORSEO_API_ACCESS_URL}
              target="_blank"
              rel="noreferrer"
            >
              {t("DataForSEO API Access")}
            </a>{" "}
            {t("and request API credentials by email.")}
          </li>
          <li>
            {t(
              "Base64 encode your DataForSEO login and API password in this format:",
            )}
            <CommandBlock command="printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64" />
          </li>
          <li>
            {t("Save the output as the")} <code>DATAFORSEO_API_KEY</code>{" "}
            {t("secret in your environment.")}
          </li>
        </>
      }
      dashboardPasteStep={t(
        "Paste the base64 value from the terminal command above and save.",
      )}
      terminalPromptHint={
        <>
          {t("Use the base64 value of")} <code>login:password</code>{" "}
          {t("when prompted.")}
        </>
      }
    />
  );
}
