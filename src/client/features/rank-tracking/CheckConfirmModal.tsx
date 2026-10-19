// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import {
  devicesCount,
  KEYWORDS_PER_BATCH,
  SECONDS_PER_BATCH,
} from "@/shared/rank-tracking";

export function CheckConfirmModal({
  keywordCount,
  devices,
  costUsd,
  isPending,
  onRunNow,
  onCancel,
}: {
  keywordCount: number;
  devices: RankTrackingConfig["devices"];
  /** Server estimate; it prices each keyword's text (operators cost 5x). */
  costUsd: number | undefined;
  isPending: boolean;
  onRunNow: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();

  const dc = devicesCount(devices);
  const totalChecks = keywordCount * dc;
  const liveTime =
    Math.ceil(totalChecks / KEYWORDS_PER_BATCH) * SECONDS_PER_BATCH;

  const eta =
    liveTime < 60
      ? t("{time}s", { time: liveTime })
      : t("{time} min", { time: Math.ceil(liveTime / 60) });

  return (
    <ConfirmDialog
      title={
        keywordCount === 1
          ? t("Check {count} keyword?", { count: keywordCount })
          : t("Check {count} keywords?", { count: keywordCount })
      }
      confirmLabel={t("Run now")}
      pending={isPending}
      onConfirm={onRunNow}
      onClose={onCancel}
    >
      {dc === 1
        ? t("{keywords} keywords × {devices} device = {total} SERP checks", {
            keywords: keywordCount,
            devices: dc,
            total: totalChecks,
          })
        : t("{keywords} keywords × {devices} devices = {total} SERP checks", {
            keywords: keywordCount,
            devices: dc,
            total: totalChecks,
          })}
      {t(".")} {t("Results in ~{time}", { time: eta })}
      {t(".")}
      {costUsd != null ? (
        <>
          {" "}
          {t("Costs about")}{" "}
          <span className="font-mono font-semibold text-foreground">
            ${costUsd.toFixed(2)}
          </span>
          {t(".")}
        </>
      ) : null}
    </ConfirmDialog>
  );
}
