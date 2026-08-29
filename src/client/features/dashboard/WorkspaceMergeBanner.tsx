import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
// FORK: locale plugin — toasts translate via the plugin tree.
import { useLocale } from "@/plugins/client/context";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import {
  getWorkspaceMergeStatus,
  mergeLegacyWorkspaces,
} from "@/serverFunctions/workspace";

// Shown on self-hosted Cloudflare Access deployments that still have per-user
// workspaces from before the shared workspace existed. The server decides
// visibility (AUTH_MODE is a runtime var there); hosted builds skip the query
// entirely since the mode is known at build time.
export function WorkspaceMergeBanner() {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["workspaceMergeStatus"],
    queryFn: () => getWorkspaceMergeStatus(),
    enabled: !isHostedClientAuthMode(),
  });

  const mergeMutation = useMutation({
    mutationFn: () => mergeLegacyWorkspaces(),
    onSuccess: ({ mergedWorkspaces }) => {
      toast.success(
        t(
          mergedWorkspaces === 1
            ? "Migrated {count} workspace into the shared workspace."
            : "Migrated {count} workspaces into the shared workspace.",
          { count: mergedWorkspaces },
        ),
      );
      // The merge changes projects, connections, and the banner's own status —
      // refetch everything rather than enumerating keys.
      void queryClient.invalidateQueries();
    },
    onError: (error) =>
      toast.error(
        getStandardErrorMessage(
          error,
          t("Couldn't migrate the workspaces. Try again."),
          t,
        ),
      ),
  });

  if (!statusQuery.data || statusQuery.data.legacyWorkspaceCount === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-5">
      <p className="max-w-3xl text-sm">
        When self-hosting on Cloudflare, there was a bug where each user had
        their own workspace. It was intended for all users to be in one
        workspace. Clicking the button below will migrate everyone&apos;s
        previous work into this shared workspace.
      </p>
      <button
        type="button"
        className="btn btn-primary btn-sm mt-4"
        disabled={mergeMutation.isPending}
        onClick={() => mergeMutation.mutate()}
      >
        {mergeMutation.isPending ? "Migrating…" : "Migrate workspaces"}
      </button>
    </div>
  );
}
