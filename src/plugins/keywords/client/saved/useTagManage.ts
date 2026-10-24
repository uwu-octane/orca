import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  deleteSavedKeywordTag,
  updateSavedKeywordTag,
} from "@/serverFunctions/keywords";
// FORK: locale plugin — toasts translate via the plugin tree.
import { useLocale } from "@/plugins/client/context";
import type { TagColorKey } from "@/shared/tag-colors";

export function useTagManage(projectId: string) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [busyTagIds, setBusyTagIds] = useState<Set<string>>(new Set());

  const markBusy = (tagId: string, busy: boolean) => {
    setBusyTagIds((current) => {
      const next = new Set(current);
      if (busy) next.add(tagId);
      else next.delete(tagId);
      return next;
    });
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["savedKeywords", projectId] });

  const updateTag = async (input: {
    tagId: string;
    name?: string;
    color?: TagColorKey | null;
  }) => {
    markBusy(input.tagId, true);
    try {
      await updateSavedKeywordTag({
        data: {
          projectId,
          tagId: input.tagId,
          name: input.name,
          color: input.color ?? undefined,
        },
      });
      await invalidate();
      toast.success(t("Tag updated"));
    } catch (error) {
      toast.error(getStandardErrorMessage(error, t("Could not update tag"), t));
    } finally {
      markBusy(input.tagId, false);
    }
  };

  const deleteTag = async (tagId: string): Promise<boolean> => {
    markBusy(tagId, true);
    try {
      await deleteSavedKeywordTag({ data: { projectId, tagId } });
      await invalidate();
      toast.success(t("Tag deleted"));
      return true;
    } catch (error) {
      toast.error(
        getStandardErrorMessage(
          error,
          t("Could not delete tag. Detach it from all keywords and try again."),
          t,
        ),
      );
      return false;
    } finally {
      markBusy(tagId, false);
    }
  };

  return { busyTagIds, updateTag, deleteTag };
}
