import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { RefreshCw, Search } from "lucide-react";
import { sortBy } from "remeda";
import { useLocale } from "@/plugins/client/context";
import { QueryError } from "@/client/components/QueryState";
import { CopyButton } from "@/client/components/CopyButton";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { DataTable, useDataTable } from "@/client/components/table/DataTable";
import { DataTableToolbar } from "@/client/components/table/DataTableToolbar";
import { TablePagination } from "@/client/components/table/TablePagination";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { numericNullsLast } from "@/client/components/table/nullSafeSort";
import { gatewayModelsQuery } from "./gatewayModelsQuery";
import {
  gatewayModelKindSchema,
  type GatewayModel,
  type GatewayModelKind,
} from "@/types/schemas/gateway-model";

const EMPTY_MODELS: GatewayModel[] = [];
const CAPABILITIES = [
  { value: "reasoning", label: "Reasoning" },
  { value: "tool-use", label: "Tool use" },
  { value: "structured-output", label: "Structured output" },
  { value: "vision", label: "Vision" },
] as const;

export function GatewayModelList({ projectId }: { projectId: string }) {
  const { t, active: locale } = useLocale();
  const [kind, setKind] = useState<GatewayModelKind>("language");
  const [search, setSearch] = useState("");
  const [creator, setCreator] = useState("");
  const [capability, setCapability] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "released", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const query = useQuery(gatewayModelsQuery(projectId));
  const models = query.isError ? EMPTY_MODELS : (query.data ?? EMPTY_MODELS);
  const creators = useMemo(
    () =>
      sortBy(
        [
          ...new Set(
            models
              .filter((model) => model.kind === kind)
              .map((model) => model.creator),
          ),
        ],
        (value) => value,
      ),
    [kind, models],
  );
  const filtered = useMemo(() => {
    const terms = search
      .normalize("NFKC")
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return models.filter(
      (model) =>
        model.kind === kind &&
        (!creator || model.creator === creator) &&
        (!capability || model.capabilities.includes(capability)) &&
        terms.every((term) =>
          `${model.id} ${model.name} ${model.creator}`
            .normalize("NFKC")
            .toLowerCase()
            .includes(term),
        ),
    );
  }, [models, kind, search, creator, capability]);
  const formatPrice = (value: number | null) =>
    value == null
      ? "—"
      : value === 0
        ? t("Free")
        : new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 4,
          }).format(value);
  const policyLabel = (value: GatewayModel["zeroDataRetention"]) =>
    value === "all"
      ? t("Supported")
      : value === "some"
        ? t("Partially supported")
        : value === "none"
          ? t("Not supported")
          : "—";
  const columns: ColumnDef<GatewayModel>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <SortableHeader column={column} label={t("Model")} />
      ),
      sortDescFirst: false,
      cell: ({ row }) => (
        <div className="group flex min-w-60 items-center gap-2">
          <span className="font-medium break-all">{row.original.id}</span>
          <CopyButton
            value={row.original.id}
            label={t("Copy model ID")}
            successMessage={t("Model ID copied")}
            variant="ghost"
            size="icon-xs"
          />
        </div>
      ),
    },
    ...(["inputPrice", "outputPrice", "contextWindow"] as const).map(
      (key): ColumnDef<GatewayModel> => ({
        accessorKey: key,
        header: ({ column }) => (
          <SortableHeader
            column={column}
            align="right"
            label={t(
              key === "inputPrice"
                ? "Input reference ($/1M tokens)"
                : key === "outputPrice"
                  ? "Output reference ($/1M tokens)"
                  : "Context window",
            )}
          />
        ),
        cell: ({ row }) =>
          key === "contextWindow"
            ? (row.original[key]?.toLocaleString() ?? "—")
            : formatPrice(row.original[key]),
        sortingFn: numericNullsLast,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right tabular-nums whitespace-nowrap",
        },
      }),
    ),
    {
      accessorKey: "capabilities",
      header: () => t("Capabilities"),
      enableSorting: false,
      cell: ({ row }) =>
        CAPABILITIES.filter((item) =>
          row.original.capabilities.includes(item.value),
        )
          .map((item) => t(item.label))
          .join(" · ") || "—",
      meta: { cellClassName: "min-w-32 text-xs" },
    },
    {
      accessorKey: "zeroDataRetention",
      header: () => t("Zero data retention"),
      enableSorting: false,
      cell: ({ row }) => policyLabel(row.original.zeroDataRetention),
      meta: { cellClassName: "whitespace-nowrap text-xs" },
    },
    {
      accessorKey: "noTraining",
      header: () => t("No training"),
      enableSorting: false,
      cell: ({ row }) => policyLabel(row.original.noTraining),
      meta: { cellClassName: "whitespace-nowrap text-xs" },
    },
    {
      accessorKey: "released",
      header: ({ column }) => (
        <SortableHeader column={column} label={t("Released")} />
      ),
      sortingFn: numericNullsLast,
      cell: ({ row }) =>
        row.original.released == null
          ? "—"
          : new Date(row.original.released).toLocaleDateString(
              locale === "zh" ? "zh-CN" : "en-US",
              { timeZone: "UTC" },
            ),
      meta: { cellClassName: "whitespace-nowrap text-xs" },
    },
  ];
  const table = useDataTable({
    data: filtered,
    columns,
    getRowId: (row) => row.id,
    withSorting: true,
    withPagination: true,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    enableMultiSort: false,
  });
  const resetPage = () =>
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  return (
    <section
      className="space-y-4"
      aria-label={t("Models")}
      aria-busy={query.isFetching}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{t("Models")}</h3>
        <Button
          variant="outline"
          size="sm"
          pending={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw />
          {t("Refresh")}
        </Button>
      </div>
      <DataTable
        table={table}
        isLoading={query.isPending}
        scrollClassName="h-[32rem]"
        empty={{ title: t("No models found") }}
        error={
          query.isError ? (
            <QueryError
              error={query.error}
              fallback={t("Couldn’t load the model list. Try again.")}
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : undefined
        }
        toolbar={
          <DataTableToolbar>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-64 pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder={t("Search models")}
                aria-label={t("Search models")}
              />
            </div>
            <Tabs
              value={kind}
              onValueChange={(value) => {
                const parsed = gatewayModelKindSchema.safeParse(value);
                if (parsed.success) {
                  setKind(parsed.data);
                  setCreator("");
                  setCapability("");
                  resetPage();
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="language">{t("Text")}</TabsTrigger>
                <TabsTrigger value="evaluation">{t("Decision")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={creator}
              onValueChange={(value) => {
                setCreator(value ?? "");
                resetPage();
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-40"
                aria-label={t("Model creator")}
              >
                <SelectValue>{creator || t("All creators")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("All creators")}</SelectItem>
                {creators.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={capability}
              onValueChange={(value) => {
                setCapability(value ?? "");
                resetPage();
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-40"
                aria-label={t("Capabilities")}
              >
                <SelectValue>
                  {t(
                    CAPABILITIES.find((item) => item.value === capability)
                      ?.label ?? "All capabilities",
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("All capabilities")}</SelectItem>
                {CAPABILITIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DataTableToolbar>
        }
        footer={
          <TablePagination
            page={pagination.pageIndex + 1}
            pageSize={pagination.pageSize}
            pageSizes={[25, 50, 100]}
            totalCount={filtered.length}
            isLoading={query.isFetching}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            onPageSizeChange={(size) => table.setPageSize(size)}
          />
        }
      />
    </section>
  );
}
