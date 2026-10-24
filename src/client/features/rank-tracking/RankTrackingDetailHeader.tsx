// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Monitor, Plus, Settings, Smartphone } from "lucide-react";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { Button } from "@/client/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { LOCATIONS } from "@/shared/keyword-locations";
import { devicesLabel, scheduleLabel } from "@/shared/rank-tracking";
import { formatNextCheck } from "./scheduleTime";
import { formatLocationLabel } from "@/shared/keyword-locations";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import {
  comparePeriodSchema,
  type ComparePeriod,
} from "@/types/schemas/rank-tracking-search";

const COMPARE_ITEMS: { value: ComparePeriod; label: string }[] = [
  { value: "1d", label: "vs yesterday" },
  { value: "7d", label: "vs last week" },
  { value: "30d", label: "vs last month" },
  { value: "90d", label: "vs 90 days ago" },
];

export function RankTrackingDetailHeader({
  config,
  run,
  costEstimate,
  hasBothDevices,
  activeDevice,
  onActiveDeviceChange,
  comparePeriod,
  onComparePeriodChange,
  onEdit,
  onToggleAddKeywords,
}: {
  config: RankTrackingConfig;
  run: { lastCheckedAt: string | null } | null | undefined;
  costEstimate: { keywordCount: number; costUsd: number } | undefined;
  hasBothDevices: boolean;
  activeDevice: "desktop" | "mobile";
  onActiveDeviceChange: (v: "desktop" | "mobile") => void;
  comparePeriod: ComparePeriod;
  onComparePeriodChange: (v: ComparePeriod) => void;
  onEdit: () => void;
  onToggleAddKeywords: () => void;
}) {
  const { t } = useLocale();

  const compareItems = COMPARE_ITEMS.map((item) => ({
    ...item,
    label: t(item.label),
  }));

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 px-4 pt-4 pb-3">
      <div>
        <h2 className="text-lg font-semibold">{config.domain}</h2>
        <p className="text-xs text-muted-foreground">
          {config.locationName
            ? formatLocationLabel(config.locationName, 2)
            : (LOCATIONS[config.locationCode] ?? "US")}{" "}
          &middot;{" "}
          {config.devices === "desktop" ? (
            t(devicesLabel(config.devices))
          ) : (
            <Tooltip>
              <TooltipTrigger
                delay={150}
                render={
                  <span className="cursor-help underline decoration-dotted underline-offset-2" />
                }
              >
                {t(devicesLabel(config.devices))}
              </TooltipTrigger>
              <TooltipContent>
                {t(
                  "Mobile results often differ from desktop. Search Console averages both, so its positions may not match.",
                )}
              </TooltipContent>
            </Tooltip>
          )}{" "}
          &middot; {t(scheduleLabel(config.scheduleInterval))}
          {config.scheduleInterval !== "manual" && config.nextCheckAt && (
            <>
              {" "}
              &middot;{" "}
              {t("Next: {date}", { date: formatNextCheck(config.nextCheckAt) })}
            </>
          )}
          {run?.lastCheckedAt && (
            <>
              {" "}
              &middot;{" "}
              {t("Last: {date}", {
                date: new Date(run.lastCheckedAt).toLocaleDateString(),
              })}
            </>
          )}
          {costEstimate && costEstimate.keywordCount > 0 && (
            <>
              {" "}
              &middot;{" "}
              {t("~${cost}/check", { cost: costEstimate.costUsd.toFixed(2) })}
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasBothDevices && (
          <SegmentedToggle
            items={[
              {
                value: "desktop" as const,
                icon: <Monitor className="size-3.5" />,
                label: t("Desktop"),
              },
              {
                value: "mobile" as const,
                icon: <Smartphone className="size-3.5" />,
                label: t("Mobile"),
              },
            ]}
            value={activeDevice}
            onChange={onActiveDeviceChange}
          />
        )}
        <Select
          items={compareItems}
          value={comparePeriod}
          onValueChange={(value) => {
            const parsed = comparePeriodSchema.safeParse(value);
            if (parsed.success) onComparePeriodChange(parsed.data);
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label={t("Comparison period")}
            title={t("Comparison period")}
            className="text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {compareItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Settings data-icon="inline-start" />
          {t("Configure")}
        </Button>
        <Button size="sm" onClick={onToggleAddKeywords}>
          <Plus data-icon="inline-start" />
          {t("Add Keywords")}
        </Button>
      </div>
    </div>
  );
}
