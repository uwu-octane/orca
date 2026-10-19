// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useState } from "react";
import { MoreHorizontal, Play, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

function ItemText({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="flex flex-col">
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </span>
  );
}

export function MoreMenu({
  onCheckNow,
  checkBusy,
  onRefreshMetrics,
  metricsRefreshing,
  trackedKeywordCount,
  hasData,
}: {
  onCheckNow: () => void;
  checkBusy: boolean;
  onRefreshMetrics: () => void;
  metricsRefreshing: boolean;
  trackedKeywordCount: number;
  hasData: boolean;
}) {
  const { t } = useLocale();

  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("More actions")}
              title={t("More actions")}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={onCheckNow} disabled={checkBusy}>
            <Play />
            <ItemText
              label={checkBusy ? t("Running...") : t("Check rankings")}
              description={t("Fetch current Google positions")}
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmingRefresh(true)}
            disabled={metricsRefreshing || !hasData}
          >
            <RefreshCw className={metricsRefreshing ? "animate-spin" : ""} />
            <ItemText
              label={
                metricsRefreshing
                  ? t("Refreshing...")
                  : t("Update keyword stats")
              }
              description={t("Volume, difficulty & CPC — not rankings")}
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmingRefresh ? (
        <ConfirmDialog
          title={t("Update keyword stats?")}
          confirmLabel={t("Update stats")}
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          {trackedKeywordCount === 1
            ? t(
                "This fetches new volume, difficulty, and CPC for all {count} tracked keyword. Each keyword uses credits. Rankings do not change.",
                { count: trackedKeywordCount },
              )
            : t(
                "This fetches new volume, difficulty, and CPC for all {count} tracked keywords. Each keyword uses credits. Rankings do not change.",
                { count: trackedKeywordCount },
              )}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
