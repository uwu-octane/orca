// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { LayoutTemplate, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
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
import { formatRelativeTime } from "@/client/lib/relative-time";
import type { ReportTemplate } from "@/types/schemas/report-templates";

export function ReportTemplatesList({
  templates,
  onEdit,
  onDelete,
}: {
  templates: ReportTemplate[];
  onEdit: (template: ReportTemplate) => void;
  onDelete: (template: ReportTemplate) => void;
}) {
  const { t } = useLocale();

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title={t("No templates yet")}
        description={t(
          "A template is a reusable brief for a kind of report: who it is for, which sections it has, how it sounds.",
        )}
      />
    );
  }

  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Name")}</TableHead>
            <TableHead>{t("Description")}</TableHead>
            <TableHead>{t("Updated")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <button
                  type="button"
                  className="text-left font-medium hover:underline"
                  onClick={() => onEdit(template)}
                >
                  {template.name}
                </button>
              </TableCell>
              <TableCell className="max-w-[420px] text-muted-foreground">
                {template.description}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelativeTime(template.updatedAt)}
              </TableCell>
              <TableCell className="w-10 text-right">
                <RowActionsMenu
                  label={t("Actions for {name}", { name: template.name })}
                >
                  <DropdownMenuItem onClick={() => onEdit(template)}>
                    <Pencil />
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(template)}
                  >
                    <Trash2 />
                    {t("Delete")}
                  </DropdownMenuItem>
                </RowActionsMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}
