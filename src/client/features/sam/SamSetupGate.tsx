// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, Wrench } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";

export function SamSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  const { t } = useLocale();

  return (
    <GateCard
      icon={Wrench}
      tone="warning"
      title={t("Enable AI Features")}
      description={
        <>
          <p>
            SAM, Orca&apos;s in-app AI agent, needs an OpenRouter API key.
            Create a key on OpenRouter, set it as the{" "}
            <code>OPENROUTER_API_KEY</code>{" "}
            {t("environment variable, restart Orca, then confirm here.")}
          </p>
          <p className="text-xs">
            {t("Step-by-step instructions for every deployment are in the")}{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to="/help/openrouter-api-key"
            >
              {t("OpenRouter API key setup guide")}
            </Link>
            {t(".")}
          </p>
        </>
      }
      actions={
        <>
          <Button size="lg" pending={isRefetching} onClick={onRetry}>
            {t("Confirm API Key")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={
              <a
                href="https://openrouter.ai/settings/keys"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            {t("Open OpenRouter Keys")}
          </Button>
        </>
      }
    >
      {errorMessage ? (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription className="text-foreground">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}
    </GateCard>
  );
}
