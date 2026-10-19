// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Fragment, type ReactNode } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  List,
  Sheet,
} from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import type { ExportFormat } from "@/client/lib/exportRows";

/** Every `exportRows()` format, plus a plain list copy (one item per line). */
type ExportAction = ExportFormat | "copy-list";

/**
 * The toolbar Export button. The caller runs each action through
 * `exportRows()`, so every format shares the empty check and the analytics
 * event. With `scopes`, each scope is a labelled section, for example
 * "Current category" and "All actionable". A scope lists its own `actions`
 * when it offers fewer than the menu.
 */
export function ExportMenu<A extends ExportAction>({
  actions,
  onExport,
  busy = false,
  disabled = false,
  copyListLabel,
  scopes,
}: {
  actions: A[];
  onExport: (action: A, scope?: string) => void;
  /** Shows a spinner on the trigger and disables it, for example while Sheets opens. */
  busy?: boolean;
  disabled?: boolean;
  /** Label for "copy-list", for example "Copy keywords". */
  copyListLabel?: string;
  scopes?: { id: string; label: string; actions?: A[] }[];
}) {
  const { t } = useLocale();
  const actionItems: Record<ExportAction, { label: string; icon: ReactNode }> =
    {
      sheets: { label: t("Export to Sheets"), icon: <Sheet /> },
      csv: { label: t("Export CSV"), icon: <FileDown /> },
      excel: { label: t("Export Excel"), icon: <FileSpreadsheet /> },
      json: { label: t("Download JSON"), icon: <FileJson /> },
      "copy-json": { label: t("Copy JSON"), icon: <Copy /> },
      "copy-list": { label: t("Copy list"), icon: <List /> },
    };

  const renderItems = (scope?: string, scopeActions: A[] = actions) =>
    scopeActions.map((action) => (
      <DropdownMenuItem key={action} onClick={() => onExport(action, scope)}>
        {actionItems[action].icon}
        {action === "copy-list" && copyListLabel
          ? copyListLabel
          : actionItems[action].label}
      </DropdownMenuItem>
    ));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            pending={busy}
            disabled={disabled}
          />
        }
      >
        {busy ? null : <Download data-icon="inline-start" />}
        {t("Export")}
        <ChevronDown data-icon="inline-end" className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {scopes
          ? scopes.map((scope, index) => (
              <Fragment key={scope.id}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{scope.label}</DropdownMenuLabel>
                  {renderItems(scope.id, scope.actions)}
                </DropdownMenuGroup>
              </Fragment>
            ))
          : renderItems()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
