import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { classifyKeywordIntent } from "@/serverFunctions/keywordIntent";
import type { getGoogleKeywordSearch } from "@/serverFunctions/keywordDimensions";
import { IntentBadge } from "../components/IntentBadge";
import { useMemo, useState } from "react";
import { CircleHelp, Sparkles } from "lucide-react";
import { useForm, useStore } from "@tanstack/react-form";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { DataTable, useDataTable } from "@/client/components/table/DataTable";
import {
  DataTableFilterGroup,
  DataTableFilterPanel,
  DataTableFilterToggle,
  DataTableRangeFilter,
  DataTableToolbar,
} from "@/client/components/table/DataTableToolbar";
import { numericNullsLast } from "@/client/components/table/nullSafeSort";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { formatNumber } from "@/plugins/keywords/client/utils";
import type { GoogleKeywordResult } from "@/types/schemas/google-keywords";
import { KeywordDimensionsCard } from "../dimensions/KeywordDimensionsCard";
import {
  EMPTY_GOOGLE_KEYWORD_FILTERS,
  filterGoogleKeywords,
} from "./googleKeywordFilters";

type KeywordRow = GoogleKeywordResult["rows"][number];
const EMPTY_ROWS: KeywordRow[] = [];
// Metric definitions: Google Ads v25 KeywordPlanHistoricalMetrics.
// Unit conversion is owned by google-ads/keywordIdeas.ts; missing values stay null.
const METRIC_HELP = {
  searchVolume:
    "Google Ads estimates the average monthly searches over the past 12 months for the selected targeting settings. This is search demand, not visits to your website. — means unavailable.",
  cpc: "Historical average cost per ad click from Google Ads, in the account currency shown in the header. Actual click costs may differ. — means unavailable.",
  competition:
    "Competition for ad placements, based on filled ad slots relative to available slots. Google's 0–100 index is displayed as 0–1 here: 29 becomes 0.29. Higher means more advertising competition, not organic ranking difficulty. — means unavailable.",
} as const;

function MetricHelpButton({ label, text }: { label: string; text: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        closeOnClick={false}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("About {label}", { label })}
            onClick={() => setOpen(!open)}
          />
        }
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent className="text-left font-normal leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
const RANGES = [
  {
    label: "Search Volume",
    min: "minVol",
    max: "maxVol",
    step: 1,
    ceiling: undefined,
  },
  {
    label: "CPC",
    min: "minCpc",
    max: "maxCpc",
    step: 0.01,
    ceiling: undefined,
  },
  {
    label: "Ads competition",
    min: "minCompetition",
    max: "maxCompetition",
    step: 0.01,
    ceiling: 1,
  },
] as const;

export function GoogleKeywordResults({
  projectId,
  result,
  pending,
  onNext,
  canRequestNext,
}: {
  projectId: string;
  result: (GoogleKeywordResult & { searchId: string }) | null;
  pending: boolean;
  onNext: () => void;
  canRequestNext: boolean;
}) {
  const { t } = useLocale();
  const client = useQueryClient();
  const decision = useMutation({
    mutationFn: (data: Parameters<typeof classifyKeywordIntent>[0]["data"]) =>
      classifyKeywordIntent({ data }),
    retry: false,
    onSuccess: (saved, request) => {
      const byKeyword = new Map(
        saved.decisions.map((item) => [item.keyword, item]),
      );
      client.setQueryData<Awaited<ReturnType<typeof getGoogleKeywordSearch>>>(
        ["googleKeywordSearch", request.projectId, request.searchId],
        (current) =>
          current
            ? {
                ...current,
                result: {
                  ...current.result,
                  rows: current.result.rows.map((row) => {
                    const intent = byKeyword.get(row.keyword);
                    return intent
                      ? {
                          ...row,
                          intent: intent.intent,
                          intentDecision: intent,
                        }
                      : row;
                  }),
                },
              }
            : current,
      );
    },
    // Earlier successful batches remain saved if a later batch fails. Refresh
    // only the persisted snapshot, never repeat a paid classification or Ads call.
    onError: (_error, request) =>
      client.invalidateQueries({
        queryKey: ["googleKeywordSearch", request.projectId, request.searchId],
        exact: true,
      }),
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const form = useForm({ defaultValues: EMPTY_GOOGLE_KEYWORD_FILTERS });
  const filters = useStore(form.store, (state) => state.values);
  const rows = result?.rows ?? EMPTY_ROWS;
  const filtered = useMemo(
    () => filterGoogleKeywords(rows, filters),
    [rows, filters],
  );
  const activeCount = Object.values(filters).filter(
    (value) => value.trim() !== "",
  ).length;
  const cpcLabel = result ? `${t("CPC")} (${result.currencyCode})` : t("CPC");
  const { isPending: intentPending, mutate: identifyIntents } = decision;
  const columns = useMemo<ColumnDef<KeywordRow>[]>(
    () => [
      {
        accessorKey: "keyword",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("Keyword")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.keyword}</span>
        ),
        sortDescFirst: false,
      },
      {
        accessorKey: "intent",
        header: () => (
          <span className="inline-flex items-center gap-1">
            <span>{t("Intent")}</span>
            <MetricHelpButton
              label={t("Intent")}
              text={t(
                "Search intent is the purpose behind a search: finding information, comparing options, taking an action, or reaching a specific website.",
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("Identify search intents with AI")}
              title={t("Identify search intents with AI")}
              pending={intentPending}
              disabled={
                pending ||
                !result ||
                !filtered.some((row) => !row.intentDecision)
              }
              onClick={() => {
                if (!result || intentPending) return;
                identifyIntents({
                  projectId,
                  searchId: result.searchId,
                  keywords: filtered
                    .filter((row) => !row.intentDecision)
                    .map((row) => row.keyword),
                });
              }}
            >
              {!intentPending && <Sparkles className="size-4" aria-hidden />}
            </Button>
          </span>
        ),
        cell: ({ row }) =>
          row.original.intentDecision ? (
            <IntentBadge intent={row.original.intentDecision.intent} />
          ) : null,
        enableSorting: false,
      },
      ...(["searchVolume", "cpc", "competition"] as const).map(
        (key): ColumnDef<KeywordRow> => ({
          accessorKey: key,
          header: ({ column }) => {
            const label =
              key === "searchVolume"
                ? t("Search Volume")
                : key === "cpc"
                  ? cpcLabel
                  : t("Ads competition");
            return (
              <span className="flex items-center justify-end gap-1">
                <SortableHeader column={column} label={label} />
                <MetricHelpButton label={label} text={t(METRIC_HELP[key])} />
              </span>
            );
          },
          cell: ({ row }) =>
            key === "searchVolume"
              ? formatNumber(row.original[key])
              : (row.original[key]?.toFixed(2) ?? "—"),
          sortingFn: numericNullsLast,
          sortDescFirst: true,
          meta: {
            headerClassName: "text-right",
            cellClassName: "text-right tabular-nums",
          },
        }),
      ),
    ],
    [
      cpcLabel,
      t,
      result,
      projectId,
      pending,
      filtered,
      intentPending,
      identifyIntents,
    ],
  );
  const table = useDataTable({
    data: filtered,
    columns,
    getRowId: (row) => row.keyword,
    withSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
    enableMultiSort: false,
  });

  return (
    <>
      {result?.rows.length ? (
        <KeywordDimensionsCard
          key={result.searchId}
          projectId={projectId}
          searchId={result.searchId}
          disabled={pending}
        />
      ) : null}
      <section aria-label={t("Keyword results")} aria-busy={pending}>
        {decision.error &&
        decision.variables?.projectId === projectId &&
        decision.variables?.searchId === result?.searchId ? (
          <p role="alert" className="mb-2 text-sm text-destructive">
            {getStandardErrorMessage(decision.error, undefined, t)}
          </p>
        ) : null}
        <DataTable
          table={table}
          isLoading={pending}
          empty={{ kind: "no-data", title: t("No keywords found.") }}
          isFiltered={activeCount > 0}
          onClearFilters={() => form.reset()}
          toolbar={
            <>
              <DataTableToolbar>
                <DataTableFilterToggle
                  open={showFilters}
                  activeCount={activeCount}
                  onToggle={() => setShowFilters(!showFilters)}
                />
                <span role="status" className="text-sm text-muted-foreground">
                  {pending
                    ? t("Searching...")
                    : t("{filtered} of {total} results on this page", {
                        filtered: filtered.length,
                        total: rows.length,
                      })}
                </span>
              </DataTableToolbar>
              {showFilters ? (
                <DataTableFilterPanel
                  activeCount={activeCount}
                  onReset={() => form.reset()}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {(["include", "exclude"] as const).map((name) => (
                      <DataTableFilterGroup
                        key={name}
                        label={
                          name === "include"
                            ? t("Include terms")
                            : t("Exclude terms")
                        }
                      >
                        <form.Field name={name}>
                          {(field) => (
                            <Input
                              className="h-7"
                              aria-label={
                                name === "include"
                                  ? t("Include terms")
                                  : t("Exclude terms")
                              }
                              placeholder={
                                name === "include"
                                  ? t("Include terms (audit, checker)")
                                  : t("Exclude terms (jobs, course)")
                              }
                              value={field.state.value}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                            />
                          )}
                        </form.Field>
                      </DataTableFilterGroup>
                    ))}
                    {RANGES.map((range) => (
                      <form.Field key={range.min} name={range.min}>
                        {(minField) => (
                          <form.Field name={range.max}>
                            {(maxField) => (
                              <DataTableRangeFilter
                                label={
                                  range.label === "CPC"
                                    ? cpcLabel
                                    : t(range.label)
                                }
                                min={{
                                  min: 0,
                                  max: range.ceiling,
                                  step: range.step,
                                  value: minField.state.value,
                                  onChange: (event) =>
                                    minField.handleChange(event.target.value),
                                }}
                                max={{
                                  min: 0,
                                  max: range.ceiling,
                                  step: range.step,
                                  value: maxField.state.value,
                                  onChange: (event) =>
                                    maxField.handleChange(event.target.value),
                                }}
                              />
                            )}
                          </form.Field>
                        )}
                      </form.Field>
                    ))}
                  </div>
                </DataTableFilterPanel>
              ) : null}
            </>
          }
          footer={
            result?.nextPageToken ? (
              <div className="flex justify-end border-t p-3">
                <Button
                  variant="outline"
                  pending={pending}
                  disabled={pending || !canRequestNext}
                  onClick={onNext}
                >
                  {t("Next page")}
                </Button>
              </div>
            ) : undefined
          }
        />
      </section>
    </>
  );
}
