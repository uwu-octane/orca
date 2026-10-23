import { useLocale } from "@/plugins/client/context";
import { useState } from "react";
import { toast } from "sonner";
import { CardShell } from "@/client/components/CardShell";
import { Button } from "@/client/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoogleConnectionCard } from "@/plugins/google-oauth/client/views";
import { captureClientEvent } from "@/client/lib/posthog";
import { dismissDashboardGa4Card } from "@/serverFunctions/dashboard";

export function Ga4ConnectCard({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const { t } = useLocale();

  const queryClient = useQueryClient();
  const [usesGa4, setUsesGa4] = useState(false);
  const dismissMutation = useMutation({
    mutationFn: () => dismissDashboardGa4Card({ data: { projectId } }),
    onSuccess: () => {
      toast.success(t("Use another analytics provider?"), {
        description: t(
          "Connect its MCP server to your AI agent to work with your analytics data.",
        ),
        duration: 10000,
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboardActivation", projectId],
      });
    },
  });

  if (!connected && !usesGa4)
    return (
      <CardShell title={t("Do you use Google Analytics 4?")}>
        <p className="text-sm text-muted-foreground">
          {t("Bring your organic traffic and conversions into your dashboard.")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setUsesGa4(true)}>
            {t("Yes, connect GA4")}
          </Button>
          <Button
            variant="outline"
            disabled={dismissMutation.isPending}
            onClick={() => {
              captureClientEvent("dashboard:ga4_dismiss");
              dismissMutation.mutate();
            }}
          >
            {t("No")}
          </Button>
        </div>
      </CardShell>
    );
  return (
    <GoogleConnectionCard
      provider="ga4"
      projectId={projectId}
      prominent
      onDismiss={
        connected
          ? undefined
          : () => {
              captureClientEvent("dashboard:ga4_dismiss");
              dismissMutation.mutate();
            }
      }
      dismissing={dismissMutation.isPending}
    />
  );
}
