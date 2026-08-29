import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
// FORK: locale plugin — module-level function; callers pass the translator in.
import type { T } from "@/plugins/locale";
import type { KeywordRow } from "@/client/features/domain/types";

type SaveMutation = (payload: {
  projectId: string;
  keywords: string[];
  locationCode?: number;
  metrics?: Array<{
    keyword: string;
    searchVolume?: number | null;
    cpc?: number | null;
    keywordDifficulty?: number | null;
  }>;
}) => void;

type SaveOptions = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export function saveSelectedKeywords({
  selectedKeywords,
  filteredKeywords,
  save,
  projectId,
  locationCode,
  t,
}: {
  t?: T;
  selectedKeywords: Set<string>;
  filteredKeywords: KeywordRow[];
  save: (payload: Parameters<SaveMutation>[0], opts?: SaveOptions) => void;
  projectId: string;
  locationCode?: number;
}) {
  if (selectedKeywords.size === 0) {
    toast.error(
      t
        ? t("Select at least one keyword first")
        : "Select at least one keyword first",
    );
    return;
  }

  const selectedRows = filteredKeywords.filter((row) =>
    selectedKeywords.has(row.keyword),
  );
  save(
    {
      projectId,
      keywords: [...selectedKeywords],
      locationCode,
      metrics: selectedRows.map((row) => ({
        keyword: row.keyword,
        searchVolume: row.searchVolume,
        cpc: row.cpc,
        keywordDifficulty: row.keywordDifficulty,
      })),
    },
    {
      onSuccess: () => {
        captureClientEvent("keyword:save", {
          source_feature: "domain_overview",
          keyword_count: selectedKeywords.size,
        });
        toast.success(
          t
            ? t("Saved {count} keywords", { count: selectedKeywords.size })
            : `Saved ${selectedKeywords.size} keywords`,
        );
      },
      onError: (error: unknown) => {
        toast.error(
          getStandardErrorMessage(
            error,
            t ? t("Save failed.") : "Save failed.",
            t,
          ),
        );
      },
    },
  );
}
