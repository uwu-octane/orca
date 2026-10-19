import { useLocale } from "@/plugins/client/context";
import { estimateRankCheckCredits } from "@/shared/rank-tracking";
import type { SaveConfigInput } from "./useSaveConfigMutations";

export function RankCheckCostEstimate({
  devices,
  serpDepth,
  schedule,
}: Pick<SaveConfigInput, "devices" | "serpDepth" | "schedule">) {
  const { t } = useLocale();

  // Scheduled checks run through the cheaper task queue; manual configs only
  // ever pay the live price.
  const { costUsd: costPerKeyword } = estimateRankCheckCredits(
    ["plain keyword"],
    devices,
    serpDepth,
    schedule === "manual" ? "live" : "queued",
  );
  const checksPerMonth =
    schedule === "daily" ? 30 : schedule === "weekly" ? 4 : 1;
  return (
    <div className="space-y-0.5 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
      <div>
        <span className="font-mono font-semibold text-foreground">
          ~${costPerKeyword.toFixed(4)}
        </span>{" "}
        {t("per keyword per check")}
      </div>
      {schedule !== "manual" && (
        <div>
          {t("50 keywords would cost")}{" "}
          <span className="font-mono font-semibold text-foreground">
            ~${(costPerKeyword * 50 * checksPerMonth).toFixed(2)}
          </span>
          {t("/month")}
        </div>
      )}
    </div>
  );
}
