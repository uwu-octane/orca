import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// FORK: locale plugin — toasts translate via the plugin tree.
import { useLocale } from "@/plugins/client/context";
import { refreshTrackingKeywordMetrics } from "@/serverFunctions/rank-tracking";

export function useMetricsRefresh(projectId: string, configId: string) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      refreshTrackingKeywordMetrics({
        data: { projectId, configId },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingResults", projectId, configId],
      });
      toast.success(
        t("Metrics updated for {count} keywords", { count: result.updated }),
      );
    },
    onError: () => {
      toast.error(t("Failed to refresh keyword metrics"));
    },
  });
  return { refresh: mutation.mutate, isRefreshing: mutation.isPending };
}
