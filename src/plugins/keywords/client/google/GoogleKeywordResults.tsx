import { useMemo, useState } from "react";
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
import { formatNumber } from "@/plugins/keywords/client/utils";
import type { GoogleKeywordResult } from "@/types/schemas/google-keywords";
import { KeywordDimensionsCard } from "../dimensions/KeywordDimensionsCard";
import {
  EMPTY_GOOGLE_KEYWORD_FILTERS,
  filterGoogleKeywords,
} from "./googleKeywordFilters";

type KeywordRow = GoogleKeywordResult["rows"][number];
const EMPTY_ROWS: KeywordRow[] = [];
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
  researchKey,
  result,
  pending,
  onNext,
}: {
  projectId: string;
  researchKey: string;
  result: GoogleKeywordResult | null;
  pending: boolean;
  onNext: () => void;
}) {
  const { t } = useLocale();
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
        accessorKey: "closeVariants",
        header: () => t("Close variants"),
        cell: ({ row }) => row.original.closeVariants.join(", ") || "—",
        enableSorting: false,
      },
      ...(["searchVolume", "cpc", "competition"] as const).map(
        (key): ColumnDef<KeywordRow> => ({
          accessorKey: key,
          header: ({ column }) => (
            <SortableHeader
              column={column}
              label={
                key === "searchVolume"
                  ? t("Search Volume")
                  : key === "cpc"
                    ? cpcLabel
                    : t("Ads competition")
              }
              align="right"
            />
          ),
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
    [cpcLabel, t],
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
          key={JSON.stringify([projectId, researchKey, result.fetchedAt])}
          projectId={projectId}
          keywords={result.rows.map((row) => row.keyword)}
          disabled={pending}
        />
      ) : null}
      <section aria-label={t("Keyword results")} aria-busy={pending}>
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
                <Button variant="outline" pending={pending} onClick={onNext}>
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
