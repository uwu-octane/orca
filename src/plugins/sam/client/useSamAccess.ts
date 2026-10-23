import { useQuery } from "@tanstack/react-query";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
// FORK: locale plugin — error copy translates via the plugin tree.
import { useLocale } from "@/plugins/client/context";
import { getSamAccessSetupStatus } from "@/serverFunctions/samAccess";

// Fails closed: chat requires a saved project Gateway connection. A failed check is an error with retry, not the key-missing gate.
type SamAccess =
  | { status: "ready" }
  | { status: "checking" }
  | {
      status: "error";
      error: unknown;
      isRetrying: boolean;
      onRetry: () => void;
    }
  | {
      status: "setup";
      errorMessage: string | null;
      isRefetching: boolean;
      onRetry: () => void;
    };

export function useSamAccess(projectId: string): SamAccess {
  const { t } = useLocale();

  const { data, error, isFetching, isRefetching, refetch } = useQuery({
    queryKey: ["samAccessStatus", projectId],
    queryFn: () => getSamAccessSetupStatus({ data: { projectId } }),
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  const onRetry = () => void refetch();

  if (data === undefined) {
    return error
      ? { status: "error", error, isRetrying: isFetching, onRetry }
      : { status: "checking" };
  }
  if (data.enabled) return { status: "ready" };
  return {
    status: "setup",
    errorMessage:
      (data.errorMessage
        ? getStandardErrorMessage(new Error(data.errorMessage), undefined, t)
        : null) ??
      (error
        ? getStandardErrorMessage(
            error,
            t("Could not load AI agent setup status."),
            t,
          )
        : null),
    isRefetching,
    onRetry,
  };
}
