import { useLocale } from "@/plugins/client/context";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";

export function MetricsTable({
  rows,
  showChange = false,
}: {
  rows: { label: ReactNode; value: ReactNode; change?: ReactNode }[];
  showChange?: boolean;
}) {
  const { t } = useLocale();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("Metric")}</TableHead>
          <TableHead className="text-right">{t("Value")}</TableHead>
          {showChange && (
            <TableHead className="text-right">{t("Change")}</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            <TableCell>{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.value}
            </TableCell>
            {showChange && (
              <TableCell className="text-right tabular-nums">
                {row.change ?? "—"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function percentChange(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
