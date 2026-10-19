import { useLocale } from "@/plugins/client/context";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { ExportMenu } from "@/client/components/ExportMenu";
import {
  DataTableFilterToggle,
  DataTableToolbar,
} from "@/client/components/table/DataTableToolbar";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import type { ExportFormat } from "@/client/lib/exportRows";

type Props = {
  /** The scope's condition limit when saved filters exceed it, else null. */
  overBudgetLimit: number | null;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  countLabel: string;
  totalCount: number | null;
  fallbackCount: number;
  onExport: (format: ExportFormat) => void;
  filterPanel: ReactNode;
  children?: ReactNode;
};

/** The toolbar, over-budget warning and filter panel above a domain table. */
export function DomainTableToolbar({
  overBudgetLimit,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  countLabel,
  totalCount,
  fallbackCount,
  onExport,
  filterPanel,
  children,
}: Props) {
  const { t } = useLocale();
  return (
    <>
      <DataTableToolbar
        actions={
          <ExportMenu
            actions={["sheets", "copy-json", "csv", "excel"]}
            onExport={onExport}
          />
        }
      >
        <DataTableFilterToggle
          open={showFilters}
          activeCount={activeFilterCount}
          onToggle={onToggleFilters}
        />
        <span className="text-sm text-muted-foreground">
          {(totalCount ?? fallbackCount).toLocaleString()} {countLabel}
        </span>
        {children}
      </DataTableToolbar>

      {overBudgetLimit != null ? (
        <div className="border-b border-border px-4 py-3">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertDescription className="text-foreground">
              {t(
                "Saved filters exceed this scope's {max}-condition limit and were not applied. Open Filters to trim them.",
                { max: overBudgetLimit },
              )}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {showFilters ? filterPanel : null}
    </>
  );
}
