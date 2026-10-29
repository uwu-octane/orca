// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  const { t } = useLocale();
  const accountStep = (
    <li>
      {t("Create an account at")}{" "}
      <a
        className={helpLinkClassName}
        href="https://openrouter.ai"
        target="_blank"
        rel="noreferrer"
      >
        openrouter.ai
      </a>{" "}
      {t("and add credits (pay-as-you-go, like DataForSEO).")}
    </li>
  );
  const keyStep = (
    <li>
      {t("Go to")}{" "}
      <a
        className={helpLinkClassName}
        href={OPENROUTER_KEYS_URL}
        target="_blank"
        rel="noreferrer"
      >
        {t("OpenRouter API Keys")}
      </a>{" "}
      {t('and click "Create API Key".')}
    </li>
  );
  return (
    <SecretHelpPage
      title={t("Set up your OpenRouter API key")}
      intro={
        <>
          {t("Orca needs the")} <code>OPENROUTER_API_KEY</code>{" "}
          {t(
            "secret before AI features like SAM, the in-app SEO agent, can run. It is optional — everything else in Orca works without it.",
          )}
        </>
      }
      everyAppIntro="SAM, prompt suggestions and website research run on OpenRouter. On Every App the gateway holds the key once, for every app."
      secretName="OPENROUTER_API_KEY"
      steps={
        <>
          {accountStep}
          {keyStep}
          <li>
            {t("Save the key as the")} <code>OPENROUTER_API_KEY</code>{" "}
            {t("secret in your environment:")}
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                {t("Docker self-hosting:")} <code>.env</code>
              </li>
              <li>{t("Cloudflare: set it in the Workers UI (see below)")}</li>
              <li>
                {t("Local development:")} <code>.env.local</code>
              </li>
            </ul>
          </li>
          <li>{t("Restart Orca.")}</li>
        </>
      }
      everyAppSteps={
        <>
          {accountStep}
          {keyStep}
          <li>
            An owner or admin runs this from the Every App checkout and pastes
            the key:
            <CommandBlock command="pnpm everyapp secret set OPENROUTER_API_KEY" />
          </li>
          <li>Reload OpenSEO.</li>
        </>
      }
      dashboardPasteStep="Paste your OpenRouter API key and save."
      terminalPromptHint="Paste your OpenRouter API key when prompted."
    />
  );
}
