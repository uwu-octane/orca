// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { ScanSearch, Trash2 } from "lucide-react";
import type { getAuditHistory } from "@/serverFunctions/audit";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryState } from "@/client/components/QueryState";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { DataTableToolbar } from "@/client/components/table/DataTableToolbar";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatDate, StatusBadge } from "@/client/features/audit/shared";

type AuditHistory = Awaited<ReturnType<typeof getAuditHistory>>;

export function AuditHistorySection({
  projectId,
  historyQuery,
  onDelete,
}: {
  projectId: string;
  historyQuery: UseQueryResult<AuditHistory>;
  onDelete: (auditId: string) => void;
}) {
  const { t } = useLocale();

  return (
    <QueryState
      query={historyQuery}
      errorFallback={t("Failed to load audit history")}
    >
      {(history) => (
        <AuditHistoryTable
          projectId={projectId}
          history={history}
          onDelete={onDelete}
        />
      )}
    </QueryState>
  );
}

function AuditHistoryTable({
  projectId,
  history,
  onDelete,
}: {
  projectId: string;
  history: AuditHistory;
  onDelete: (auditId: string) => void;
}) {
  const { t } = useLocale();

  if (history.length === 0) {
    return <EmptyState icon={ScanSearch} title={t("No audits yet")} />;
  }

  return (
    <TableCard>
      <DataTableToolbar>
        <h2 className="text-sm font-semibold">{t("Previous Audits")}</h2>
      </DataTableToolbar>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Date")}</TableHead>
            <TableHead>{t("URL")}</TableHead>
            <TableHead>{t("Status")}</TableHead>
            <TableHead>{t("Pages")}</TableHead>
            <TableHead>{t("Lighthouse")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((audit) => (
            <TableRow key={audit.id} className="group">
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(audit.startedAt)}
              </TableCell>
              <TableCell className="max-w-[220px] truncate">
                {audit.startUrl}
              </TableCell>
              <TableCell>
                <StatusBadge status={audit.status} />
              </TableCell>
              <TableCell>{audit.pagesTotal || audit.pagesCrawled}</TableCell>
              <TableCell>
                {audit.ranLighthouse ? (
                  <Badge variant="outline" size="sm">
                    {t("Yes")}
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <HistoryActions
                  projectId={projectId}
                  auditId={audit.id}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}

function HistoryActions({
  projectId,
  auditId,
  onDelete,
}: {
  projectId: string;
  auditId: string;
  onDelete: (auditId: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-end gap-2 reveal-on-hover">
      <Button
        size="xs"
        nativeButton={false}
        render={
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            search={{ auditId, tab: "pages" }}
          />
        }
      >
        {t("View")}
      </Button>
      <RowActionsMenu label={t("Audit actions")}>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(auditId)}
        >
          <Trash2 />
          {t("Delete audit")}
        </DropdownMenuItem>
      </RowActionsMenu>
    </div>
  );
}
