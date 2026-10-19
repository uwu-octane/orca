// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { scheduleLabel } from "@/shared/rank-tracking";
import { Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { DialogFooter } from "@/client/components/ui/dialog";
import { aiMarketLabel, type AiCostEstimate } from "@/shared/ai-visibility";
import { EngineLabel } from "./EngineLabel";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { AiQueryError, aiMoney } from "./shared";

export type TrackerSetupReviewData = {
  patch: AiTrackerPatch;
  estimate: AiCostEstimate;
};

export function TrackerSetupReview({
  review,
  enabled,
  creating,
  pending,
  error,
  canSchedule,
  scheduling,
  onBack,
  onSave,
  onSaveAndSchedule,
}: {
  review: TrackerSetupReviewData;
  enabled: boolean;
  /** No tracker yet; saving creates one on the weekly schedule. */
  creating: boolean;
  pending: boolean;
  error: unknown;
  canSchedule: boolean;
  scheduling: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveAndSchedule: () => void;
}) {
  const { t } = useLocale();

  const paused = !enabled && !creating;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("Review your changes before saving.")}{" "}
        {enabled
          ? t("These settings apply to your enabled schedule.")
          : creating
            ? t(
                "Tracking runs weekly. The first check is a week from now; use Run now for results sooner.",
              )
            : t(
                "Track weekly to collect fresh answers once a week. A tracker that has never run on a schedule also runs its first check now.",
              )}
      </p>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm border-border">
        {review.patch.engines && (
          <div>
            <dt className="text-muted-foreground">{t("Engines")}</dt>
            <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {review.patch.engines?.map((engine) => (
                <EngineLabel key={engine} engine={engine} />
              ))}
            </dd>
          </div>
        )}
        {review.patch.prompts !== undefined && (
          <div>
            <dt className="text-muted-foreground">{t("New prompts")}</dt>
            <dd className="mt-1">{review.patch.prompts?.length ?? 0}</dd>
          </div>
        )}
        {review.patch.prompts?.[0]?.topic && (
          <div>
            <dt className="text-muted-foreground">{t("Topic")}</dt>
            <dd className="mt-1">{review.patch.prompts[0].topic}</dd>
          </div>
        )}
        {review.patch.locationCode && review.patch.languageCode && (
          <div>
            <dt className="text-muted-foreground">{t("Market")}</dt>
            <dd className="mt-1">
              {aiMarketLabel({
                locationCode: review.patch.locationCode,
                languageCode: review.patch.languageCode,
              })}
            </dd>
          </div>
        )}
      </dl>
      {!!review.patch.prompts?.length && (
        <div
          className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-4 border-border"
          data-ph-mask
        >
          <h3 className="text-sm font-semibold">{t("Prompts to add")}</h3>
          {review.patch.prompts.map((prompt) => (
            <p
              key={prompt.text}
              className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed"
            >
              {prompt.text}
            </p>
          ))}
        </div>
      )}
      <div className="space-y-1 rounded-lg bg-muted/60 p-4 text-sm">
        <p>
          {t("Each run collects")}{" "}
          <strong>{review.estimate.observations}</strong>{" "}
          {review.estimate.observations === 1
            ? t("answer for")
            : t("answers for")}{" "}
          <strong>{aiMoney(review.estimate.costUsd)}</strong>
        </p>
        <p>
          <strong>{aiMoney(review.estimate.monthlyCostUsd)}</strong>{" "}
          {t("estimated per month if it runs {schedule}", {
            schedule: t(
              scheduleLabel(review.estimate.scheduleInterval),
            ).toLowerCase(),
          })}
          {t(".")}
        </p>
      </div>
      {!!error && <AiQueryError error={error} />}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onBack}
        >
          {t("Back to editing")}
        </Button>
        <Button
          type="button"
          variant={paused ? "secondary" : "default"}
          disabled={pending}
          onClick={onSave}
        >
          {pending && !scheduling && (
            <Loader2 className="size-4 animate-spin" />
          )}
          {enabled
            ? t("Save reviewed changes")
            : creating
              ? t("Save and track weekly")
              : t("Save as paused")}
        </Button>
        {paused && (
          <Button
            type="button"
            disabled={
              pending || !canSchedule || review.estimate.observations === 0
            }
            onClick={onSaveAndSchedule}
          >
            {pending && scheduling && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {t("Save and track weekly")}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
