// FORK: link to the same project connection used by all Gateway agents.
import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Button } from "@/client/components/ui/button";

export function SamSetupGate({
  projectId,
  errorMessage,
  isRefetching,
  onRetry,
}: {
  projectId: string;
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  const { t } = useLocale();
  return (
    <GateCard
      icon={Wrench}
      tone="warning"
      title={t("Configure AI provider")}
      description={null}
      actions={
        <>
          <Button
            nativeButton={false}
            render={
              <Link
                to="/p/$projectId/settings/integrations"
                params={{ projectId }}
                hash="ai-providers"
              />
            }
          >
            {t("Settings")}
          </Button>
          <Button variant="outline" pending={isRefetching} onClick={onRetry}>
            {t("Retry")}
          </Button>
        </>
      }
    >
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </GateCard>
  );
}
