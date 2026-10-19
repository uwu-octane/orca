// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { translate } from "@/plugins/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HelpLabel } from "@/client/components/HelpLabel";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Spinner } from "@/client/components/ui/spinner";
import type { BacklinksRow } from "./backlinksPageTypes";
import type { BacklinksRowsSortField } from "@/types/schemas/backlinks";
import {
  extractUrlPath,
  formatCompactDate,
  formatDecimal,
  formatNumber,
  truncateMiddle,
} from "./backlinksPageUtils";
import type { DomainRatings } from "./useAhrefsDomainRatings";

/**
 * Row model for the backlinks table. In the one-per-domain view, depth-0 rows
 * are each domain's strongest link and can expand into the domain's remaining
 * links (depth-1) plus a transient status row while they load.
 */
export type BacklinksDisplayRow =
  | {
      kind: "link";
      row: BacklinksRow;
      depth: 0 | 1;
      expandable: boolean;
      expanded: boolean;
    }
  | { kind: "status"; domain: string; status: "loading" | "error" | "empty" };

function BacklinksSourceLink({
  url,
  maxLength,
  muted = false,
}: {
  url: string;
  maxLength: number;
  muted?: boolean;
}) {
  return (
    <SafeExternalLink
      url={url}
      label={truncateMiddle(extractUrlPath(url), maxLength)}
      className={`inline-flex items-center gap-1 break-all underline-offset-4 hover:underline ${muted ? "text-xs text-muted-foreground" : "text-sm"}`}
    />
  );
}

function BacklinkFlags({ row }: { row: BacklinksRow }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap gap-1">
      {row.isLost ? <Badge variant="destructive">{t("Lost")}</Badge> : null}
      {row.isBroken ? <Badge variant="warning">{t("Broken")}</Badge> : null}
      {row.isDofollow === false ? (
        <Badge variant="outline">{t("Nofollow")}</Badge>
      ) : null}
      {row.linksCount != null && row.linksCount > 1 ? (
        <Badge variant="outline">
          {t("{count} links", { count: row.linksCount })}
        </Badge>
      ) : null}
    </div>
  );
}

function StatusCell({ status }: { status: "loading" | "error" | "empty" }) {
  const { t } = useLocale();

  if (status === "loading") {
    return (
      <span className="flex items-center gap-2 pl-6 text-sm text-muted-foreground">
        <Spinner className="size-3.5" />
        {t("Loading links…")}
      </span>
    );
  }
  return (
    <span className="pl-6 text-sm text-muted-foreground">
      {status === "error"
        ? t("Couldn't load this domain's links.")
        : t("No other links from this domain.")}
    </span>
  );
}

function SourceCell({
  displayRow,
  onToggleDomain,
}: {
  displayRow: BacklinksDisplayRow;
  onToggleDomain?: (domain: string) => void;
}) {
  const { t } = useLocale();
  if (displayRow.kind === "status") {
    return <StatusCell status={displayRow.status} />;
  }

  const { row, depth, expandable, expanded } = displayRow;
  if (depth > 0) {
    return (
      <div className="break-all pl-6">
        {row.urlFrom ? (
          <BacklinksSourceLink url={row.urlFrom} maxLength={48} muted />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    );
  }

  const domainLabel = row.domainFrom?.replace(/^www\./, "") ?? "-";
  return (
    <div className="flex items-start gap-1.5 break-all">
      {expandable && row.domainFrom && onToggleDomain ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="-ml-1 shrink-0"
          aria-label={
            expanded
              ? t("Hide all links from {domain}", { domain: domainLabel })
              : t("Show all links from {domain}", { domain: domainLabel })
          }
          aria-expanded={expanded}
          onClick={() => onToggleDomain(row.domainFrom ?? "")}
        >
          <ChevronRight
            className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </Button>
      ) : null}
      <div>
        <div className="font-semibold">{domainLabel}</div>
        {row.urlFrom ? (
          <BacklinksSourceLink url={row.urlFrom} maxLength={48} muted />
        ) : null}
      </div>
    </div>
  );
}

/** Renders nothing for status rows, the link cell otherwise. */
function linkCell(
  render: (row: BacklinksRow) => React.ReactNode,
): (ctx: { row: { original: BacklinksDisplayRow } }) => React.ReactNode {
  return ({ row }) =>
    row.original.kind === "link" ? render(row.original.row) : null;
}

function buildBaseColumns(
  onToggleDomain?: (domain: string) => void,
): ColumnDef<BacklinksDisplayRow>[] {
  // Sortable column ids ("rank", "domainRank", "spamScore", "firstSeen") map
  // to server-side sort fields — sorting re-queries DataForSEO across the
  // full backlink profile, not just the loaded page.
  return [
    {
      id: "source",
      enableSorting: false,
      header: () => (
        <HelpLabel
          label={translate("Source")}
          helpText={translate("Page linking to you")}
        />
      ),
      meta: { headerClassName: "min-w-[200px]" },
      cell: ({ row }) => (
        <SourceCell displayRow={row.original} onToggleDomain={onToggleDomain} />
      ),
    },
    {
      id: "target",
      enableSorting: false,
      header: () => (
        <HelpLabel
          label={translate("Target")}
          helpText={translate("Destination on your site")}
        />
      ),
      meta: { headerClassName: "min-w-[180px]" },
      cell: linkCell((row) => (
        <div className="break-all">
          {row.urlTo ? (
            <BacklinksSourceLink url={row.urlTo} maxLength={40} />
          ) : (
            "-"
          )}
        </div>
      )),
    },
    {
      id: "anchor",
      enableSorting: false,
      header: () => (
        <HelpLabel
          label={translate("Anchor")}
          helpText={translate("Text or format of the link")}
        />
      ),
      meta: { headerClassName: "min-w-[150px]" },
      cell: linkCell((row) => (
        <div className="space-y-0.5 wrap-anywhere">
          <span className="text-sm">
            {row.anchor || translate("No anchor text")}
          </span>
          {row.itemType ? (
            <div className="text-xs text-muted-foreground">{row.itemType}</div>
          ) : null}
        </div>
      )),
    },
    {
      id: "flags",
      enableSorting: false,
      header: () => (
        <HelpLabel
          label={translate("Flags")}
          helpText={translate(
            "Special backlink attributes, such as lost, broken, nofollow, or multiple links from the same source.",
          )}
        />
      ),
      meta: { headerClassName: "min-w-[110px]" },
      cell: linkCell((row) => <BacklinkFlags row={row} />),
    },
    {
      id: "rank" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.rank : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={translate("Link")}
          helpText={translate("Authority of the linking page")}
          align="right"
        />
      ),
      sortDescFirst: true,
      cell: linkCell((row) => (
        <div className="text-right tabular-nums text-sm">
          {formatNumber(row.rank)}
        </div>
      )),
    },
    {
      id: "domainRank" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.domainFromRank : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={translate("DA")}
          helpText={translate("Authority of the linking domain")}
          align="right"
        />
      ),
      sortDescFirst: true,
      cell: linkCell((row) => (
        <div className="text-right tabular-nums text-sm">
          {formatNumber(row.domainFromRank)}
        </div>
      )),
    },
    {
      id: "spamScore" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.spamScore : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={translate("Spam")}
          helpText={translate(
            "Estimated spam risk for this backlink. Higher scores are more likely to be manipulative or low quality.",
          )}
          align="right"
        />
      ),
      sortDescFirst: true,
      cell: linkCell((row) => {
        const value = row.spamScore;
        return (
          <div className="text-right tabular-nums text-sm">
            {value != null ? (
              Math.round(value)
            ) : (
              <span title={translate("Spam score unknown")}>-</span>
            )}
          </div>
        );
      }),
    },
    {
      id: "firstSeen" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.firstSeen : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={translate("First Seen")}
          helpText={translate(
            "When this link was first discovered by the crawler",
          )}
        />
      ),
      sortDescFirst: true,
      cell: linkCell((row) => (
        <div className="whitespace-nowrap text-sm">
          <div>{formatCompactDate(row.firstSeen)}</div>
          {row.lastSeen ? (
            <div className="text-xs text-muted-foreground">
              {translate("Last {date}", {
                date: formatCompactDate(row.lastSeen),
              })}
            </div>
          ) : null}
        </div>
      )),
    },
  ];
}

/**
 * Columns for the backlinks table. When `domainRatings` is provided (the user
 * clicked "Ahrefs DR"), an Ahrefs DR column is inserted after DA; otherwise it
 * stays hidden. DR is loaded client-side from Ahrefs, so it can't participate
 * in server-side sorting.
 */
export function buildBacklinksColumns(
  domainRatings: DomainRatings | null,
  onToggleDomain?: (domain: string) => void,
): ColumnDef<BacklinksDisplayRow>[] {
  const baseColumns = buildBaseColumns(onToggleDomain);
  if (!domainRatings) return baseColumns;

  const ratings = domainRatings;
  const drColumn: ColumnDef<BacklinksDisplayRow> = {
    id: "ahrefsDr",
    enableSorting: false,
    header: () => (
      <span className="flex w-full justify-end">
        <HelpLabel
          label="Ahrefs DR"
          helpText={translate(
            "Ahrefs Domain Rating (0-100) for the linking domain.",
          )}
        />
      </span>
    ),
    cell: linkCell((row) => {
      const domain = row.domainFrom?.replace(/^www\./, "");
      const dr = domain ? (ratings[domain] ?? null) : null;
      return (
        <div className="text-right tabular-nums text-sm">
          {dr == null ? "-" : formatDecimal(dr)}
        </div>
      );
    }),
  };

  const insertAt =
    baseColumns.findIndex((column) => column.id === "domainRank") + 1;
  return [
    ...baseColumns.slice(0, insertAt),
    drColumn,
    ...baseColumns.slice(insertAt),
  ];
}
