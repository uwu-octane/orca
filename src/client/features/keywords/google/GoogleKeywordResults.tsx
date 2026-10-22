import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatNumber } from "@/client/features/keywords/utils";
import type { GoogleKeywordResult } from "@/types/schemas/google-keywords";

export function GoogleKeywordResults({
  result,
  pending,
  onNext,
}: {
  result: GoogleKeywordResult;
  pending: boolean;
  onNext: () => void;
}) {
  const { t } = useLocale();
  return (
    <TableCard>
      <div className="px-4 py-3 text-sm text-muted-foreground">
        {t("{count} results", { count: result.rows.length })}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Keyword")}</TableHead>
            <TableHead>{t("Close variants")}</TableHead>
            <TableHead className="text-right">{t("Search Volume")}</TableHead>
            <TableHead className="text-right">
              {t("CPC")} ({result.currencyCode})
            </TableHead>
            <TableHead className="text-right">{t("Ads competition")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row) => (
            <TableRow key={row.keyword}>
              <TableCell className="font-medium">{row.keyword}</TableCell>
              <TableCell>{row.closeVariants.join(", ") || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(row.searchVolume)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.cpc?.toFixed(2) ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.competition?.toFixed(2) ?? "—"}
              </TableCell>
            </TableRow>
          ))}
          {result.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>{t("No keywords found.")}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {result.nextPageToken ? (
        <div className="flex justify-end border-t p-3">
          <Button variant="outline" disabled={pending} onClick={onNext}>
            {t("Next page")}
          </Button>
        </div>
      ) : null}
    </TableCard>
  );
}
