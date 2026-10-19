// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { translate } from "@/plugins/locale";
import { ExternalPage } from "./siteTabParts";
import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import type { ComponentProps } from "react";
import { DashboardDataTable } from "./DashboardDataTable";

type Keyword = {
  query: string;
  page?: string;
  clicks: number;
  impressions: number;
  position: number;
};
const columns: ColumnDef<Keyword>[] = [
  {
    accessorKey: "query",
    header: ({ column }) => (
      <SortableHeader column={column} label={translate("Keyword")} />
    ),
    filterFn: "includesString",
  },
  ...(["impressions", "clicks", "position"] as const).map(
    (id) =>
      ({
        accessorKey: id,
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={
              id === "position"
                ? "Avg. position"
                : id === "clicks"
                  ? translate("Clicks")
                  : translate("Impressions")
            }
            align="right"
          />
        ),
        cell: ({ getValue }) =>
          id === "position"
            ? Number(getValue()).toFixed(1)
            : Number(getValue()).toLocaleString(),
        filterFn: "inNumberRange",
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right tabular-nums",
        },
      }) satisfies ColumnDef<Keyword>,
  ),
];
export function DashboardKeywordTable({
  rows,
  showPages = false,
  sortBy = "impressions",
  ...tableProps
}: {
  rows: Keyword[];
  showPages?: boolean;
  sortBy?: "impressions" | "clicks";
} & Pick<
  ComponentProps<typeof DashboardDataTable>,
  "tabs" | "resetKey" | "isLoading" | "error" | "empty"
>) {
  const { t } = useLocale();

  const pageColumn: ColumnDef<Keyword> = {
    accessorKey: "page",
    header: "Page",
    filterFn: "includesString",
    cell: ({ row }) => <ExternalPage url={row.original.page ?? null} />,
  };
  return (
    <DashboardDataTable
      {...tableProps}
      rows={rows}
      columns={
        showPages ? [columns[0], pageColumn, ...columns.slice(1)] : columns
      }
      initialSorting={[{ id: sortBy, desc: true }]}
      filters={[
        { id: "query", label: t("Keyword"), kind: "text" },
        ...(showPages
          ? [{ id: "page", label: t("Page"), kind: "text" as const }]
          : []),
        { id: "impressions", label: t("Impressions"), kind: "number" },
        { id: "clicks", label: t("Clicks"), kind: "number" },
        { id: "position", label: "Average position", kind: "number" },
      ]}
    />
  );
}
