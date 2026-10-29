import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useLocale } from "@/plugins/client/context";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { classifyKeywordIntent } from "@/serverFunctions/keywordIntent";
import type { getGoogleKeywordSearch } from "@/serverFunctions/keywordDimensions";
import { IntentBadge } from "../components/IntentBadge";
import type { GoogleKeywordResult } from "@/types/schemas/google-keywords";

export function GoogleKeywordIntentCell({
  projectId,
  searchId,
  row,
  disabled,
}: {
  projectId: string;
  searchId: string;
  row: GoogleKeywordResult["rows"][number];
  disabled: boolean;
}) {
  const { t } = useLocale();
  const client = useQueryClient();
  const decision = useMutation({
    mutationFn: () =>
      classifyKeywordIntent({
        data: { projectId, searchId, keyword: row.keyword },
      }),
    retry: false,
    onSuccess: (saved) =>
      client.setQueryData<Awaited<ReturnType<typeof getGoogleKeywordSearch>>>(
        ["googleKeywordSearch", projectId, searchId],
        (current) =>
          current
            ? {
                ...current,
                result: {
                  ...current.result,
                  rows: current.result.rows.map((item) =>
                    item.keyword === row.keyword
                      ? { ...item, intent: saved.intent, intentDecision: saved }
                      : item,
                  ),
                },
              }
            : current,
      ),
  });
  const saved = row.intentDecision ?? decision.data;
  return (
    <div className="flex flex-col items-start gap-1">
      {saved ? (
        <IntentBadge intent={saved.intent} />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("Identify intent for {keyword}", {
            keyword: row.keyword,
          })}
          title={t("Identify intent")}
          pending={decision.isPending}
          disabled={disabled || decision.isPending}
          onClick={() => decision.mutate()}
        >
          <Sparkles className="size-4" aria-hidden />
        </Button>
      )}
      {decision.error ? (
        <span role="alert" className="max-w-64 text-xs text-destructive">
          {getStandardErrorMessage(decision.error, undefined, t)}
        </span>
      ) : null}
    </div>
  );
}
